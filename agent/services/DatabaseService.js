const axios = require('axios');

class DatabaseService {
  constructor() {
    this.userApiUrl = 'https://dashboard-ofrecetutalento.com:3100/api';
    this.resultsApiUrl = 'https://dashboard-ofrecetutalento.com:4900/api';
    this.cache = new Map();
    this.cacheExpiry = 5 * 60 * 1000; // 5 minutes
  }

  async fetchCandidates(token, userId = null) {
    try {
      // Check cache first
      const cacheKey = `candidates_${token?.substring(0, 10)}_${userId || 'no-user'}`;
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
        console.log('📦 Using cached candidates data');
        return cached.data;
      }

      console.log('🌐 Fetching candidates from multiple APIs...');
      console.log('🔑 Token format check:', token ? `${token.substring(0, 20)}...` : 'No token provided');
      console.log('👤 User ID:', userId || 'Not provided');
      
      // Fetch users and offers first
      const [usersData, offersData] = await Promise.all([
        this.fetchUsers(token),
        this.fetchOffers(token, userId)
      ]);

      // Now fetch results using the users and offers data
      const resultsData = await this.fetchResultsWithData(usersData, offersData);

      // Combine and transform the data
      const candidates = this.combineApiData(usersData, resultsData, offersData);
        
      // Cache the result
      this.cache.set(cacheKey, {
        data: candidates,
        timestamp: Date.now()
      });

      console.log(`✅ Fetched and combined ${candidates.length} candidates from APIs`);
      
      // If no candidates were fetched, provide a helpful message
      if (candidates.length === 0) {
        console.log('⚠️ No candidates fetched - this could be due to:');
        console.log('   - Authentication issues (expired/invalid token)');
        console.log('   - API endpoints not available');
        console.log('   - No data available in the system');
      }
      
      return candidates;

    } catch (error) {
      console.error('❌ Error fetching candidates from APIs:', error.message);
      
      // Return empty array instead of mock data
      console.log('🔄 No candidates available due to API errors');
      return [];
    }
  }

  mapStatus(status) {
    const statusMap = {
      'new': 'new',
      'in_review': 'in_review',
      'interview_scheduled': 'interview_scheduled',
      'interview_completed': 'interview_completed',
      'hired': 'hired',
      'rejected': 'rejected'
    };
    return statusMap[status] || 'new';
  }

  extractSkills(talents) {
    if (!talents) return [];
    return talents.split(',').map(skill => skill.trim()).filter(skill => skill.length > 0);
  }

  extractEducation(user) {
    // Return empty array since education data should come from APIs
    return [];
  }

  extractExperienceHistory(user) {
    // Return empty array since experience data should come from APIs
    return [];
  }

  extractLanguages(languages) {
    if (!languages) return ['English'];
    return languages.split(',').map(lang => lang.trim()).filter(lang => lang.length > 0);
  }

  generateMockReferences(candidateName) {
    // Return empty array since references should come from APIs
    return [];
  }

  clearCache() {
    this.cache.clear();
    console.log('🗑️ Cache cleared');
  }

  getCacheStats() {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.keys())
    };
  }

  async fetchUsers(token) {
    try {
      console.log('👥 Fetching users from API...');
      
      const response = await axios.get(`${this.userApiUrl}/user/get-users`, {
        headers: {
          'Authorization': token,
          'Content-Type': 'application/json'
        },
        timeout: 5000
      });
      
      if (response.data && response.data.status === 'success') {
        console.log(`✅ Fetched ${response.data.users?.length || 0} users`);
        return response.data.users || [];
      } else {
        console.log('⚠️ Invalid users API response format');
        return [];
      }
    } catch (error) {
      console.error('❌ Error fetching users:', error.message);
      return [];
    }
  }

  async fetchResultsWithData(users, offers) {
    try {
      console.log('📊 Fetching results from API...');
      
      // Prepare the body like in the original code
      const usersData = users.map((user) => ({
        name: user.name,
        experience: user.experience,
        talents: user.talents,
        languajes: user.languaje,
      }));
      
      const offersData = offers.map((offer) => ({
        title: offer.title,
        description: offer.description,
        area: offer.area,
        experience: offer.experience,
        languajes: offer.languajes,
      }));

      const body = {
        users: usersData,
        offer: offersData,
      };

      const response = await axios.post(`${this.resultsApiUrl}/results/get-results`, body, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 5000
      });

      if (response.data && response.data.status === 'success') {
        console.log(`✅ Fetched results successfully`);
        return response.data.results || [];
      } else {
        console.log('⚠️ Invalid results API response format');
        return [];
      }
    } catch (error) {
      console.error('❌ Error fetching results:', error.message);
      return [];
    }
  }

  async fetchResults(token) {
    try {
      console.log('📊 Fetching results from API...');
      
      // First get users and offers to send in the POST body
      const users = await this.fetchUsers(token);
      const offers = await this.fetchOffers('test_user_123', token); // Using a default user ID for now
      
      return await this.fetchResultsWithData(users, offers);
    } catch (error) {
      console.error('❌ Error fetching results:', error.message);
      return [];
    }
  }

  async fetchOffers(token, userId = null) {
    try {
      console.log('💼 Fetching offers from API...');
      
      // Use the original endpoint pattern: /offer/get-offers/${user._id}
      let endpoint = `${this.userApiUrl}/offer/get-offers`;
      
      if (userId) {
        endpoint += `/${userId}`;
        console.log(`🔗 Using user-specific endpoint: ${endpoint}`);
      } else {
        endpoint += '/all';
        console.log(`🔗 Using general endpoint: ${endpoint}`);
      }
      
      const response = await axios.get(endpoint, {
        headers: {
          'Authorization': token,
          'Content-Type': 'application/json'
        },
        timeout: 5000
      });
      
      if (response.data && response.data.status === 'success') {
        console.log(`✅ Fetched ${response.data.offers?.length || 0} offers`);
        return response.data.offers || [];
      } else {
        console.log('⚠️ Invalid offers API response format');
        return [];
      }
    } catch (error) {
      console.error('❌ Error fetching offers:', error.message);
      return [];
    }
  }

  combineApiData(users, results, offers) {
    const candidates = [];
    const candidateMap = new Map();

    // Process users first
    users.forEach(user => {
      const candidate = {
        id: user._id || `user_${Date.now()}_${Math.random()}`,
        name: user.name || 'Unknown Candidate',
        email: user.email || 'no-email@example.com',
        phone: user.phone || user.tel || '+50700000000',
        position: 'Unknown Position',
        status: this.mapStatus(user.status || 'new'),
        experience: user.experience || 'Unknown',
        skills: this.extractSkills(user.talents || ''),
        education: this.extractEducation(user),
        experience_history: this.extractExperienceHistory(user),
        languages: this.extractLanguages(user.languaje || ''),
        location: user.country || 'Unknown',
        salary_expectation: 'Not specified',
        availability: user.availability || 'Unknown',
        resume_url: user.cv || null,
        notes: user.notes || '',
        references: this.generateMockReferences(user.name),
        source: 'users'
      };
      
      candidateMap.set(candidate.id, candidate);
    });

    // Process offers and link to users
    offers.forEach(offer => {
      if (offer.user && Array.isArray(offer.user)) {
        offer.user.forEach(user => {
          const existingCandidate = candidateMap.get(user._id);
          if (existingCandidate) {
            // Update existing candidate with offer data
            existingCandidate.position = offer.title || existingCandidate.position;
            existingCandidate.source = 'offers';
            existingCandidate.offerId = offer._id;
          } else {
            // Create new candidate from offer
            const candidate = {
              id: user._id || `offer_${Date.now()}_${Math.random()}`,
              name: user.name || 'Unknown Candidate',
              email: user.email || 'no-email@example.com',
              phone: user.phone || user.tel || '+50700000000',
              position: offer.title || 'Unknown Position',
              status: this.mapStatus(user.status || 'new'),
              experience: user.experience || 'Unknown',
              skills: this.extractSkills(user.talents || ''),
              education: this.extractEducation(user),
              experience_history: this.extractExperienceHistory(user),
              languages: this.extractLanguages(user.languaje || ''),
              location: user.country || 'Unknown',
              salary_expectation: 'Not specified',
              availability: user.availability || 'Unknown',
              resume_url: user.cv || null,
              notes: user.notes || '',
              references: this.generateMockReferences(user.name),
              source: 'offers',
              offerId: offer._id
            };
            
            candidateMap.set(candidate.id, candidate);
          }
        });
      }
    });

    // Process results and enhance existing candidates
    results.forEach(result => {
      const candidateId = result.userId || result.user?._id;
      if (candidateId && candidateMap.has(candidateId)) {
        const candidate = candidateMap.get(candidateId);
        candidate.results = candidate.results || [];
        candidate.results.push({
          testType: result.testType || 'Unknown',
          score: result.score || 'N/A',
          date: result.date || result.createdAt,
          status: result.status || 'completed'
        });
        candidate.source = candidate.source ? `${candidate.source}+results` : 'results';
      }
    });

    return Array.from(candidateMap.values());
  }
}

module.exports = DatabaseService; 
import { FaBell, FaEnvelope, FaInfoCircle, FaUserCheck } from "react-icons/fa";

const notificationTypes = {
  ALERT: {
    icon: <FaBell className="text-yellow-500" />,
    color: "bg-yellow-100",
  },
  MESSAGE: {
    icon: <FaEnvelope className="text-blue-500" />,
    color: "bg-blue-100",
  },
  UPDATE: {
    icon: <FaInfoCircle className="text-green-500" />,
    color: "bg-green-100",
  },
  FAVORITE: {
    icon: <FaUserCheck className="text-purple-500" />,
    color: "bg-purple-100",
  },
};

const NotificationsList = ({ fakeNotifications }) => {
  return (
    <ul className="space-y-3  text-left mt-4 p-1.5 max-h-[500px] overflow-y-auto ">
      {fakeNotifications.length > 0 ? (
        fakeNotifications.map((notification) => {
          const { icon, color } = notificationTypes[notification.type];
          return (
            <li
              key={notification.id}
              className={`flex items-center p-4 cursor-pointer rounded-lg shadow-md transform transition-transform duration-300 hover:scale-[1.01] ${color}`}
            >
              <div className="mr-3 text-2xl">{icon}</div>
              <div className="flex-1">
                <p className="text-gray-700 font-medium">
                  {notification.message}
                </p>
                <span className="text-xs text-gray-400">
                  {new Date(notification.date).toLocaleDateString()}
                </span>
              </div>
            </li>
          );
        })
      ) : (
        <p className="text-gray-600">No hay nuevas notificaciones.</p>
      )}
    </ul>
  );
};

export default NotificationsList;

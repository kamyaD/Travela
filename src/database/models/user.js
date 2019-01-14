export default (sequelize, DataTypes) => {
  const User = sequelize.define(
    'User',
    {
      fullName: {
        type: DataTypes.STRING,
        allowNull: false
      },
      email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
      },
      userId: {
        allowNull: false,
        unique: true,
        type: DataTypes.STRING
      },
      passportName: {
        allowNull: true,
        type: DataTypes.STRING
      },
      department: {
        allowNull: true,
        type: DataTypes.STRING
      },
      occupation: {
        allowNull: true,
        type: DataTypes.STRING
      },
      manager: {
        allowNull: true,
        type: DataTypes.STRING
      },
      gender: {
        allowNull: true,
        type: DataTypes.STRING
      },
      picture: {
        type: DataTypes.STRING,
      },
      location: {
        allowNull: false,
        type: DataTypes.STRING
      }
    },
    {}
  );
  User.associate = (models) => {
    User.belongsToMany(models.Role, {
      foreignKey: 'userId',
      as: 'roles',
      through: models.UserRole
    });
    User.belongsToMany(models.Center, {
      foreignKey: 'userId',
      as: 'centers',
      through: models.UserRole
    });
    User.hasMany(models.GuestHouse, {
      foreignKey: 'userId',
      as: 'guesthouses',
    });
    User.hasMany(models.ChangedRoom, {
      foreignKey: 'userId',
      as: 'changedRooms',
    });
    User.hasMany(models.TravelReadinessDocuments, {
      foreignKey: 'userId',
      as: 'travelDocuments',
      sourceKey: 'userId'
    });
    User.hasMany(models.Comment, {
      foreignKey: 'userId',
      as: 'comments',
    });
  };
  return User;
};

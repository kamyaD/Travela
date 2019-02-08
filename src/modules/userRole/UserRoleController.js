import dotenv from 'dotenv';
import axios from 'axios';
import models from '../../database/models';
import CustomError from '../../helpers/Error';
import UserHelper from '../../helpers/user';
import NotificationEngine from '../notifications/NotificationEngine';

dotenv.config();

class UserRoleController {
  static response(res, message, result) {
    return res.status(message[0]).json({
      success: message[2],
      message: message[1],
      result
    });
  }

  static async getAllUser(req, res) {
    const allowedField = ['email'];
    const field = allowedField.includes(req.query.field);
    const filter = field ? req.query.field : '';
    const include = !field ? [
      {
        model: models.Role,
        as: 'roles',
        through: { attributes: [] }
      }
    ] : '';
    const attributes = filter ? ['fullName', `${filter}`] : '';

    const result = await models.User.findAll({
      attributes,
      include
    });
    const message = [200, 'data', true];
    UserRoleController.response(res, message, result);
  }

  static async getOneUser(req, res) {
    const { id } = req.user;
    const result = await models.User.findOne({
      where: { userId: req.params.id },
      include: [
        {
          model: models.Role,
          as: 'roles',
          attributes: ['roleName', 'description'],
          through: { attributes: [] },
          include: [
            {
              model: models.Center,
              as: 'centers',
              attributes: ['id', 'location'],
              through: {
                attributes: [],
                where: { userId: id }
              }
            }
          ]
        }
      ]
    });
    const message = [200, 'data', true];
    UserRoleController.response(res, message, result);
  }

  static async updateUserProfile(req, res) {
    const user = await models.User.findOne({
      where: {
        userId: req.params.id
      }
    });
    if (!user) {
      const message = [400, 'User does not exist', false];
      return UserRoleController.response(res, message);
    }
    const result = await user.update({
      passportName: req.body.passportName || user.passportName,
      department: req.body.department || user.department,
      occupation: req.body.occupation || user.occupation,
      manager: req.body.manager || user.manager,
      gender: req.body.gender || user.gender,
      location: req.body.location || user.location
    });
    const message = [200, 'Profile updated successfully', true];
    UserRoleController.response(res, message, result);
  }

  static async addUser(req, res) {
    const { location } = req.body;
    const userId = req.user.UserInfo.id;
    try {
      if (!userId) {
        const message = [400, 'User Id required', false];
        return UserRoleController.response(res, message);
      }
      const [result] = await models.User.findOrCreate({
        where: {
          email: req.user.UserInfo.email,
          userId: req.user.UserInfo.id
        },
        defaults: {
          picture: req.user.UserInfo.picture,
          fullName: req.user.UserInfo.name,
          location
        }
      });
      const [userRole] = await result.addRole(401938);
      result.dataValues.roles = userRole;
      const message = [201, 'User created successfully', true];
      UserHelper.authorizeRequests(req.userToken);
      const userOnProduction = await UserHelper.getUserOnProduction(result);
      const userOnBamboo = await UserHelper.getUserOnBamboo(
        userOnProduction.data.values[0].bamboo_hr_id
      );
      const managerOnBamboo = await UserHelper.getUserOnBamboo(userOnBamboo.data.supervisorEId);
      const managerOnProduction = await UserHelper.getUserOnProduction(managerOnBamboo);
      const travelaUser = UserHelper.generateTravelaUser(managerOnProduction, managerOnBamboo);
      const userLocation = UserHelper.getUserLocation(userOnBamboo.data.location);
      const [managerResult] = await models.User.findOrCreate({
        where: {
          email: travelaUser.email,
          userId: travelaUser.userId
        },
        defaults: {
          picture: travelaUser.picture,
          fullName: travelaUser.fullName,
          location: travelaUser.location,
          gender: travelaUser.gender
        }
      });

      const updateData = {
        department: userOnBamboo.data.department,
        occupation: userOnBamboo.data.jobTitle,
        manager: managerOnBamboo.data.displayName,
        passportName: userOnProduction.data.values[0].name,
      };
      if (!userOnProduction.data.values[0].location && !result.dataValues.location) {
        updateData.location = userLocation;
      }
      if (!result.dataValues.gender) {
        updateData.gender = userOnBamboo.data.gender;
      }
      await managerResult.addRole(53019);
      result.dataValues.manager = travelaUser.fullName;
      await result.update(updateData);
      return UserRoleController.response(res, message, result);
    } catch (error) {
      /* istanbul ignore next */
      return CustomError.handleError(error.toString(), 500, res);
    }
  }

  static async getUserFromApi(req) {
    const {
      body: { email },
      userToken
    } = req;
    const baseUrL = process.env.NODE_ENV === 'production'
      ? process.env.ANDELA_PROD_API
      : process.env.ANDELA_STAGING_API;

    const url = `${baseUrL}/users?email=${email}`;
    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${userToken}`
    };
    const data = await axios.get(url, {
      headers
    });
    return data;
  }

  static async createUserFromApi(req) {
    const { data } = await UserRoleController.getUserFromApi(req);
    const user = data.values[0];
    if (data.total === 0) {
      return { found: false };
    }
    const createdUser = await models.User.create({
      fullName: user.name,
      email: user.email,
      userId: user.id,
      picture: user.picture,
      location: user.location ? user.location.name : ''
    });
    return { createdUser, found: true };
  }

  static async updateUserRole(req, res) {
    try {
      const {
        roleId,
        centerId,
        body: { email, center, roleName },
        user: { UserInfo: { name } }
      } = req;
      let user = await models.User.findOne({
        where: { email },
        attributes: ['email', 'fullName', 'userId', 'id']
      });
      if (!user) {
        const { found, createdUser } = await UserRoleController.createUserFromApi(req);
        if (!found) {
          const message = 'Email does not exist';
          return CustomError.handleError(message, 404, res);
        }
        user = createdUser;
      }
      if (!centerId && roleId === 339458) {
        const message = [400, 'Please provide center', false];
        return UserRoleController.response(res, message);
      }
      const hasRole = await models.UserRole.find({
        where: { roleId, userId: user.id }
      });
      const error = 'User already has this role';
      if (hasRole) return CustomError.handleError(error, 409, res);
      const [[result]] = await user.addRole(roleId, {
        through: { centerId }
      });
      user.dataValues.centers = [{ id: result.centerId, location: center }];
      const message = [200, 'Role updated successfully', true];

      await UserRoleController.sendNotificationEmail(user, roleName, name);
      UserRoleController.response(res, message, user);
    } catch (error) {
      /* istanbul ignore next */
      res.status(500).json({
        message: 'error',
        error
      });
    }
  }

  static async addRole(req, res) {
    try {
      const result = await models.Role.create(req.body);
      const message = [201, 'Role created successfully', true];
      UserRoleController.response(res, message, result);
    } catch (error) {
      const message = [409, 'Role already exist', false];
      UserRoleController.response(res, message, error);
    }
  }

  static async getRoles(req, res) {
    const result = await models.Role.findAll({
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: models.User,
          as: 'users',
          attributes: ['email', 'userId'],
          through: { attributes: [] }
        }
      ]
    });
    const message = [200, 'data', true];
    UserRoleController.response(res, message, result);
  }

  static async getOneRole(req, res) {
    const { id } = req.params;
    try {
      const result = await UserRoleController.calculateUserRole(id);
      const message = [200, 'data', true];
      UserRoleController.response(res, message, result);
    } catch (error) {
      const message = [400, 'Params must be an integer', false];
      UserRoleController.response(res, message);
    }
  }

  static async calculateUserRole(roleId) {
    const result = await models.Role.findById(roleId, {
      order: [[{ model: models.User, as: 'users' }, models.UserRole, 'createdAt', 'DESC']],
      include: [
        {
          model: models.User,
          as: 'users',
          attributes: ['email', 'fullName', 'userId', 'id'],
          through: {
            attributes: []
          },
          include: [
            {
              model: models.Center,
              as: 'centers',
              attributes: ['id', 'location'],
              through: {
                attributes: [],
                where: { roleId }
              }
            }
          ]
        }
      ]
    });
    return result;
  }

  static async autoAdmin(req, res) {
    try {
      const findUser = await models.User.findOne({
        where: {
          email: req.user.UserInfo.email
        }
      });
      if (findUser.email !== process.env.DEFAULT_ADMIN) {
        const message = [409, 'Email does not match', false];
        UserRoleController.response(res, message);
      } else {
        await findUser.addRole(10948);
        const message = [200, 'Your role has been Updated to a Super Admin', true];
        UserRoleController.response(res, message);
      }
    } catch (error) {
      const message = [400, 'Email does not exist in Database', false];
      UserRoleController.response(res, message);
    }
  }

  static async getRecipient(recipientName, recipientId) {
    const recipient = await models.User.findOne({
      where: {
        $or: [{ fullName: recipientName }, { userId: recipientId }]
      }
    });
    return recipient;
  }

  static async deleteUserRole(req, res) {
    try {
      const { roles } = req.user;
      const { userId, roleId } = req.params;
      // checks if role to delete is super admin
      const RequestUserRoleIds = roles.map(role => role.dataValues.id);
      const superAdminId = 10948;
      const isRequestUserSuperAdmin = RequestUserRoleIds.includes(superAdminId);
      if (parseInt(roleId, 10) === superAdminId && !isRequestUserSuperAdmin) {
        const error = `Only a 'Super Administrator' can change the role of another 'Super Administrator'`; // eslint-disable-line
        return CustomError.handleError(error, 403, res);
      }
      const query = { where: { userId, roleId } };
      const deletedRole = await models.UserRole.destroy(query);
      const msg = `User can no longer perform operations associated with the role: '${
        req.roleName
      }'`; // eslint-disable-line
      const message = [200, msg, true];
      if (deletedRole) return UserRoleController.response(res, message);

      const error = `User with the role: '${req.roleName}' does not exist`;
      if (!deletedRole) return CustomError.handleError(error, 404, res);
    } catch (error) {
      /* istanbul ignore next */
      return CustomError.handleError(error, 500, res);
    }
  }

  static async sendNotificationEmail(user, roleName, name) {
    const { email, fullName } = user;
    const data = {
      recipient: { name: fullName, email },
      topic: 'Assignment of new role',
      type: 'Send role assignment email notification',
      redirectLink: `${process.env.REDIRECT_URL}`,
      details: { role: roleName, assignerName: name }
    };
    NotificationEngine.sendMail(data);
  }
}

export default UserRoleController;

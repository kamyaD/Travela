import express from 'express';
import middlewares from '../../middlewares';
import UserRoleController from './UserRoleController';
import UpdateUserRoleController from './UpdateRoleController';


const { authenticate, Validator, RoleValidator } = middlewares;
const Router = express.Router();

Router.get('/user',
  authenticate,
  RoleValidator.checkUserRole(
    ['Super Administrator', 'Travel Administrator', 'Travel Team Member']
  ),
  UserRoleController.getAllUser);

Router.get('/user/roles', authenticate, UserRoleController.getRoles);
Router.put('/user/admin', authenticate, UserRoleController.autoAdmin);
Router.get('/user/:id',
  authenticate,
  Validator.getUserId,
  UserRoleController.getOneUser);

Router.put(
  '/user/:id/profile',
  authenticate,
  RoleValidator.validatePersonalInformation,
  Validator.checkGender,
  Validator.checkSignedInUser,
  UserRoleController.updateUserProfile
);

Router.post(
  '/user',
  authenticate,
  Validator.checkEmail,
  UserRoleController.addUser
);

Router.post(
  '/user/role',
  authenticate,
  RoleValidator.validateAddRole,
  RoleValidator.checkUserRole(
    ['Super Administrator']
  ),
  UserRoleController.addRole
);

Router.patch(
  '/user/role/:id',
  authenticate,
  RoleValidator.validateAddRole,
  RoleValidator.checkUserRole(
    ['Super Administrator']
  ),
  UpdateUserRoleController.updateRole
);

Router.put(
  '/user/role/update',
  authenticate,
  RoleValidator.checkUserRole(
    ['Super Administrator', 'Travel Administrator']
  ),
  RoleValidator.validateUpdateRole,
  Validator.checkEmail,
  RoleValidator.roleExists,
  Validator.centerExists,
  RoleValidator.validateRoleAssignment,
  UserRoleController.updateUserRole
);

Router.get('/user/roles/:id', authenticate, UserRoleController.getOneRole);

Router.delete(
  '/user/roles/:userId/:roleId',
  authenticate,
  RoleValidator.checkUserRole(
    ['Super Administrator', 'Travel Administrator']
  ),
  RoleValidator.roleExists,
  UserRoleController.deleteUserRole
);

export default Router;

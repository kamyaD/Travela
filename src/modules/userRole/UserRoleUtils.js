import paginationHelper from '../../helpers/Pagination';

class UserRoleUtils {
  static getPaginatedRoles(req, count, roles) {
    const {
      users
    } = roles;

    const {
      currentPage,
      pageCount,
      initialPage
    } = paginationHelper.getPaginationParams(req, count);
    const pagintedUsersRole = users
      .slice(initialPage.offset, (Number.parseInt(initialPage.limit, 10) + initialPage.offset));
    const paginationData = {
      currentPage,
      pageCount,
      pagintedUsersRole,
    };
    return {
      paginationData
    };
  }

  static getAllOrPaginatedRoles({
    req,
    roles,
    count,
    allPage
  }) {
    const {
      id, roleName, description, createdAt, updatedAt, users
    } = roles;
    let userRoles = {
      roleData: {
        id, description, roleName, createdAt, updatedAt
      },
      users
    };

    if (!allPage) {
      const {
        paginationData: { currentPage, pageCount, pagintedUsersRole }
      } = UserRoleUtils.getPaginatedRoles(req, count, roles);
      userRoles = {
        ...userRoles,
        meta: {
          currentPage,
          pageCount,
        },
        users: pagintedUsersRole
      };
    }
    return userRoles;
  }

  static sanitizePaginationParams(req, roleId) {
    if (!Number.isInteger(Number.parseInt(roleId, 10))) {
      const message = [400, 'Params must be an integer', false];
      return message;
    }

    const { allPage } = req.query;

    if (allPage && allPage !== 'true') {
      const message = [400, 'param allPage is optional and should be true', false];
      return message;
    }
    return false;
  }
}

export default UserRoleUtils;

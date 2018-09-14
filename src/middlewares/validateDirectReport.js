import models from '../database/models';
import notFoundError from '../helpers/notFoundError';

const validateDirectReport = async (req, res, next) => {
  const { user } = req;
  const { requestId } = req.params;
  const request = await models.Request.findById(requestId);
  if (!request) {
    const error = 'Request not found';
    return notFoundError(error, res);
  }
  // FIX: replace name with Id
  if (user.UserInfo.name !== request.manager) {
    return res.status(403).json({
      success: false,
      error: 'Permission denied, you are not requesters manager',
    });
  }
  req.request = request;
  return next();
};

export default validateDirectReport;

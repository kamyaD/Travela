import models from '../../database/models';
import Utils from '../../helpers/Utils';
import Error from '../../helpers/Error';
import NotificationEngine from '../notifications/NotificationEngine';
import UserRoleController from '../userRole/UserRoleController';

class CommentsController {
  static async createComment(req, res) {
    try {
      const { requestId } = req.body;
      const { name, email, picture } = req.user.UserInfo;
      const commentData = {
        ...req.body,
        id: Utils.generateUniqueId(),
        userName: name,
        userEmail: email,
        picture,
      };
      const request = await models.Request.findById(requestId);
      if (request) {
        await CommentsController.createNotificationByManager(req, res, request);
        const newComment = await models.Comment.create(commentData);
        return res.status(201).json({
          success: true,
          message: 'Comment created successfully',
          comment: newComment,
        });
      }
      return Error.handleError('Request does not exist', 404, res);
    } catch (error) { /* istanbul ignore next */
      return Error.handleError('Server Error', 500, res);
    }
  }

  static async createNotificationByManager(req, res, request) {
    try {
      const {
        name, picture
      } = req.user.UserInfo;
      const { manager, id } = request;
      const managerDetail = await UserRoleController.getRecipient(manager);
      const newNotificationDetail = {
        senderId: managerDetail.userId,
        recipientId: request.userId,
        notificationType: 'general',
        message: 'posted a comment',
        notificationLink: `/requests/${id}`,
        senderName: name,
        senderImage: picture
      };
      /* istanbul ignore next */
      if (managerDetail.userId === req.user.UserInfo.id) {
        return NotificationEngine.notify(newNotificationDetail);
      }
    } catch (error) { /* istanbul ignore next */
      return Error.handleError('Server Error', 500, res);
    }
  }


  static async editComment(req, res) {
    try {
      const { requestId } = req.body;
      const commentId = req.params.id;
      const { name, email, picture } = req.user.UserInfo;
      const commentData = {
        ...req.body, userName: name, userEmail: email, picture, isEdited: true
      };
      const request = await models.Request.findById(requestId);
      if (!request) {
        return Error.handleError('Request does not exist', 404, res);
      }
      const foundComment = await models.Comment.findById(commentId);
      if (!foundComment) {
        return Error.handleError('Comment does not exist', 404, res);
      }
      const editedComment = await models.Comment.update(commentData,
        { where: { id: commentId }, returning: true, plain: true });
      return res.status(200).json({
        success: true,
        message: 'Comment updated successfully',
        comment: editedComment[1],
      });
    } catch (error) { /* istanbul ignore next */
      return Error.handleError('Server Error', 500, res);
    }
  }

  static async deleteComment(req, res) {
    try {
      const commentId = req.params.id;
      const foundComment = await models.Comment.findById(commentId);
      if (!foundComment) {
        return res.status(404).json({
          success: false,
          error: 'Comment does not exist',
        });
      }
      const isAllowed = req.user.UserInfo.email === foundComment.userEmail;
      if (isAllowed) {
        await foundComment.destroy();
        return res.status(200).json({
          success: true,
          message: 'Comment deleted successfully',
        });
      }
      return res.status(401).json({
        success: false,
        message: 'You are not allowed to delete this comment',
      });
    } catch (error) { /* istanbul ignore next */
      return Error.handleError('Server Error', res);
    }
  }
}

export default CommentsController;

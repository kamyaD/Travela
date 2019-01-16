import _ from 'lodash';
import dotenv from 'dotenv';
import moment from 'moment';

import getRequests from './getRequests.data';
import models from '../../database/models';
import Pagination from '../../helpers/Pagination';
import Utils from '../../helpers/Utils';
import {
  createSubquery,
  includeStatusSubquery,
  asyncWrapper,
  retrieveParams,
} from '../../helpers/requests';
import {
  countByStatus,
  getTotalCount,
} from '../../helpers/requests/paginationHelper';
import UserRoleController from '../userRole/UserRoleController';
import NotificationEngine from '../notifications/NotificationEngine';
import Error from '../../helpers/Error';
import TravelChecklistController from '../travelChecklist/TravelChecklistController';
import RequestTransactions from './RequestTransactions';
import RequestUtils from './RequestUtils';

dotenv.config();

const { Op } = models.Sequelize;
const noResult = 'No records found';
let params = {};
class RequestsController {
  static setRequestParameters(req) {
    params = retrieveParams(req);
    params.userId = req.user.UserInfo.id;
    params.parameters = {
      req,
      limit: params.limit,
      offset: params.offset,
      modelName: 'Request',
      search: params.search,
    };
  }

  static async createRequest(req, res) {
    // eslint-disable-next-line
    let { trips, ...requestDetails } = req.body;
    delete requestDetails.status; // requester cannot post status
    try {
      await RequestUtils.validateTripDates(req.user.UserInfo.id, trips);

      const requestData = {
        ...requestDetails,
        id: Utils.generateUniqueId(),
        userId: req.user.UserInfo.id,
        picture: req.user.UserInfo.picture,
      };
      

      const multipleRoomsData = trips.map(trip => ({
        arrivalDate: (requestData.tripType === 'oneWay' || (requestData.tripType === 'multi' && !trip.returnDate))
          ? trip.departureDate : trip.returnDate,
        departureDate: trip.departureDate,
        location: trip.destination,
        gender: requestDetails.gender,
      }));

      const availableRoomsAndBeds = await RequestUtils.fetchMultiple(multipleRoomsData);
      const allRooms = availableRoomsAndBeds.reduce((room, newList) => newList.concat(room));

      const availableBedSpaces = allRooms.map(bedId => bedId.id);

      trips = trips.map((trip) => {
        if (
          availableBedSpaces.length < 1
          || !availableBedSpaces.includes(trip.bedId)
          || !trip.bedId
        ) {
          // eslint-disable-next-line
          trip.accommodationType = trip.bedId == -1 ? 'Hotel Booking' : 'Not Required';
          // eslint-disable-next-line
          trip.bedId = null;
        }

        return trip;
      });

      await RequestTransactions.createRequestTransaction(req, res, requestData, trips);
    } catch (error) {
      /* istanbul ignore next */
      return Error.handleError(error.message || error, error.status || 500, res);
    }
  }

  static async sendNotificationToManager(
    req,
    res,
    request,
    message,
    mailTopic,
    mailType,
  ) {
    const { userId, id, manager } = request;
    const recipient = await UserRoleController.getRecipient(manager);
    // map the mailType to a notificationType.
    const notificationTypeMap = {
      'New Request': 'pending',
      'Updated Request': 'general',
      'Deleted Request': 'general'
    };
    const notificationData = {
      senderId: userId,
      recipientId: recipient.userId,
      // if notificationType at this point is undefined then default to
      // general
      notificationType: notificationTypeMap[mailType] || 'general',
      message,
      notificationLink: `/requests/my-approvals/${id}`,
      senderName: req.user.UserInfo.name,
      senderImage: req.user.UserInfo.picture,
    };
    NotificationEngine.notify(notificationData);
    return NotificationEngine.sendMail(RequestUtils
      .getMailData(request, recipient, mailTopic, mailType));
  }

  static removeTripWhere(subquery) {
    const newSubquery = subquery;
    newSubquery.include.map((includeModel) => {
      const newIncludeModel = includeModel;
      if (newIncludeModel.where) {
        newIncludeModel.where = undefined;
      }
      return newIncludeModel;
    });
    return newSubquery;
  }

  static removeRequestWhere(subquery) {
    let newSubQuery = subquery;
    newSubQuery.where = { userId: params.userId };
    if (params.status) {
      newSubQuery = includeStatusSubquery(
        newSubQuery,
        params.status,
        'Request',
      );
    }
    return newSubQuery;
  }

  static generateSubquery(searchTrips) {
    let subquery = createSubquery(params.parameters);
    if (!searchTrips) {
      subquery = RequestsController.removeTripWhere(subquery);
    } else {
      subquery = RequestsController.removeRequestWhere(subquery);
    }
    return subquery;
  }

  static async getRequestsFromDb(subquery) {
    const requests = await models.Request.findAndCountAll(subquery);
    return requests;
  }

  static async returnRequests(req, res, requests) {
    const count = await asyncWrapper(
      req,
      countByStatus,
      models.Request,
      params.userId,
      params.search,
    );
    const pagination = Pagination.getPaginationData(
      params.page,
      params.limit,
      getTotalCount(params.status, count),
    );
    const message = params.search && !requests.count
      ? noResult
      : Utils.getResponseMessage(pagination, params.status, 'Request');
    const newRequest = Promise.all(requests.rows.map(async (request) => {
      const travelCompletion = await TravelChecklistController
        .checkListPercentage(req, res, request.id);
      request.dataValues.travelCompletion = travelCompletion;
      return request;
    }));

    const allRequests = await newRequest;
    return res.status(200).json({
      success: true, message, requests: allRequests, meta: { count, pagination }
    });
  }

  static async processResult(req, res, searchTrips = false) {
    const subquery = RequestsController.generateSubquery(searchTrips);
    let requests = { count: 0 };
    requests = await asyncWrapper(
      res,
      RequestsController.getRequestsFromDb,
      subquery,
    );
    if (!requests.count && !searchTrips) {
      return RequestsController.processResult(req, res, !searchTrips);
    }
    return RequestsController.returnRequests(req, res, requests);
  }

  static async getUserRequests(req, res) {
    RequestsController.setRequestParameters(req);
    try {
      await RequestsController.processResult(req, res);
    } catch (error) {
      /* istanbul ignore next */
      return Error.handleError('Server Error', 500, res);
    }
  }

  static async getTravellingTeammates(req, res) {
    try {
      const { dept } = req.params;
      const currentUserId = req.user.UserInfo.id;
      const today = moment().format('YYYY-MM-DD');
      const requests = await models.Request.findAll({
        where: { department: dept, status: 'Verified', userId: { [Op.ne]: currentUserId } },
        order: [[{ model: models.Trip, as: 'trips' }, 'departureDate', 'asc']],
        include: [{
          model: models.Trip,
          as: 'trips',
          where: { departureDate: { [Op.gte]: today } },
        }]
      });
      const uniqRequests = _.uniqBy(requests, 'userId');

      const teammates = uniqRequests.map(({ trips, name, picture }) => {
        const { returnDate } = trips[trips.length - 1];
        return ({
          name,
          picture,
          destination: trips[0].destination.split(',')[0],
          departureDate: trips[0].departureDate,
          returnDate,
        });
      });

      res.status(200).json({
        success: true,
        teammates
      });
    } catch (error) {
      /* istanbul ignore next */
      return Error.handleError('Server Error', 500, res);
    }
  }

  static async getUserRequestDetails(req, res) {
    const { requestId } = req.params;
    try {
      const requestData = await getRequests(requestId, models);
      if (!requestData) {
        const error = `Request with id ${requestId} does not exist`;
        return Error.handleError(error, 404, res);
      }
      if (requestData.status !== 'Open') {
        const approver = await models.Approval.findOne({
          where: {
            requestId
          }
        });
        const approverImage = await UserRoleController.getRecipient(approver.approverId, null);
        requestData.dataValues.approver = approver.approverId;
        requestData.dataValues.timeApproved = approver.updatedAt;
        requestData.dataValues.approverImage = approverImage.picture;
      }
      return res.status(200).json({
        success: true,
        requestData,
      });
    } catch (error) {
      /* istanbul ignore next */
      return Error.handleError('Server Error', 500, res);
    }
  }

  static async updateRequest(req, res) {
    const { requestId } = req.params;
    let { trips } = req.body;
    // eslint-disable-next-line
    trips = trips.map((trip) => {
      if (trip.bedId < 1) {
        // eslint-disable-next-line
        trip.accommodationType = trip.bedId == -1 ? 'Hotel Booking' : 'Not Required';
        // eslint-disable-next-line
        trip.bedId = null;
      } else {
        // eslint-disable-next-line
        trip.accommodationType = 'Residence';
      }
      return trip;
    });
    try {
      await RequestUtils.validateTripDates(req.user.UserInfo.id, trips, requestId);

      await RequestTransactions.updateRequestTransaction(req, res, trips);
    } catch (error) {
      /* istanbul ignore next */
      return Error.handleError(error.message || error, error.status || 500, res);
    }
  }

  static async handleDestroyTripComments(req) {
    const { requestId } = req.params;
    await models.Trip.destroy({ where: { requestId } });
    await models.Comment.destroy({ where: { requestId } });
    await models.Approval.destroy({ where: { requestId } });
  }

  static async deleteRequest(req, res) {
    try {
      await RequestTransactions.deleteRequestTransaction(req, res);
    } catch (error) {
      /* istanbul ignore next */
      return Error.handleError(error, 500, res);
    }
  }

  static async verifyRequest(req, res) {
    try {
      const { requestId } = req.params;
      const { name, picture, id: senderId } = req.user.UserInfo;
      const request = await models.Request.findById(requestId);
      const approval = await models.Approval.findOne({ where: { requestId } });
      approval.status = 'Verified';
      request.status = 'Verified';
      await request.save();
      await approval.save();
      const { id, userId } = request;
      const recipient = await UserRoleController.getRecipient(null, userId);
      const notificationData = {
        senderId,
        senderName: name,
        senderImage: picture,
        recipientId: userId,
        notificationType: 'general',
        requestId: id,
        message: 'verified your travel request',
        notificationLink: `/requests/${id}`
      };
      const emailRequest = { name: request.name, manager: request.name, id: request.id };
      const emailData = RequestUtils.getMailData(
        emailRequest, recipient, 'Travel Request Verified', 'Verified', '/redirect/requests/'
      );
      NotificationEngine.notify(notificationData);
      NotificationEngine.sendMail(emailData);
      return res.status(200)
        .json({ success: true, message: 'Verification Successful', updatedRequest: { request } });
    } catch (error) {
      /* istanbul ignore next */
      return Error.handleError(error, 500, res);
    }
  }
}

export default RequestsController;

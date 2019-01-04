import dotenv from 'dotenv';
import Utils from '../../helpers/Utils';
import models from '../../database/models';
import Error from '../../helpers/Error';
import RoomsManager from './RoomsManager';
import {
  BedName, GuestHouseIncludeHelper
} from '../../helpers/guestHouse/index';
import GuestHouseTransactions from './GuestHouseTransactions';
import { srcRequestWhereClause } from '../../helpers/requests/index';

dotenv.config();
class GuestHouseController {
  static async postGuestHouse(req, res) {
    const { rooms, ...data } = req.body;
    const generateId = Utils.generateUniqueId();
    const user = req.user.UserInfo.id;
    const guestHouse = { ...data, userId: user, id: generateId };
    await GuestHouseTransactions.postGuestHouseTransaction(req, res, guestHouse, rooms);
  }

  static async createMaintainanceRecord(req, res) {
    try {
      const newMaintainanceRecord = await models.Maintainance.create({
        ...req.body,
        roomId: req.params.id
      });
      return res.status(201).json({
        success: true,
        message: 'Room maintainance record created',
        maintainance: newMaintainanceRecord,
      });
    } catch (error) { /* istanbul ignore next */
      Error.handleError(error, 500, res);
    }
  }

  static async updateMaintenanceRecord(req, res) {
    try {
      const updatedMaintenanceRecord = await models.Maintainance
        .update({ ...req.body }, {
          returning: true,
          where: {
            roomId: req.params.id
          }
        });
      return updatedMaintenanceRecord[0] === 0
        ? res.status(404).json({
          success: false,
          message: 'The maintenance record does not exist'
        })
        : res.status(200).json({
          success: true,
          message: 'Room maintenance record updated',
          maintenance: updatedMaintenanceRecord
        });
    } catch (error) { /* istanbul ignore next */
      Error.handleError(error, 500, res);
    }
  }

  static async deleteMaintenanceRecord(req, res) {
    try {
      await models.Maintainance.destroy({
        where: { roomId: req.params.id }
      });
      return res.status(200).json({
        success: true,
        message: 'Maintenance record deleted successfully'
      });
    } catch (error) { /* istanbul ignore next */
      Error.handleError(error, 500, res);
    }
  }

  static async updateRoomFaultyStatus(req, res) {
    const guestRoomId = req.params.id;
    const room = await models.Room.findOne({
      where: { id: guestRoomId }
    });
    if (!room) {
      return res.status(400).json({
        success: false,
        message: 'The room does not exist'
      });
    }
    const result = await room.update({
      faulty: req.body.fault
    });
    return res.status(201).json({
      success: true,
      message: 'Room maintainance details updated successfully',
      result
    });
  }

  static async getGuestHouses(req, res) {
    try {
      const guestHouses = await models.GuestHouse.findAll({
        where: { disabled: false },
        include: [{
          as: 'rooms',
          model: models.Room,
          where: { isDeleted: false }
        }],
        order: [
          ['createdAt', 'DESC']
        ]
      });
      const message = guestHouses.length === 0
        ? 'No guesthouse exists at the moment'
        : 'Guesthouses retrieved successfully';
      return res.status(200).json({
        success: true,
        message,
        guestHouses
      });
    } catch (error) { /* istanbul ignore next */
      Error.handleError(error, 500, res);
    }
  }

  static async getGuestHouseDetails(req, res) {
    const { guestHouseId } = req.params;
    const { query } = req;
    const { doInclude, makeTripsDateClauseFrom } = GuestHouseIncludeHelper;
    const bedTripsWhereClause = makeTripsDateClauseFrom(query);
    const guestHouse = await models.GuestHouse.findOne({
      where: { id: guestHouseId, disabled: false },
      include: [{
        ...doInclude('Room', 'rooms'),
        where: { isDeleted: false },
        include: [{
          ...doInclude('Bed', 'beds'),
          include: [{
            // enforce a LEFT OUTER JOIN for trips `where`, set false on require
            ...doInclude('Trip', 'trips', bedTripsWhereClause, false),
            include: [{
              ...doInclude('Request', 'request', srcRequestWhereClause),
            }]
          }]
        }, {
          ...doInclude('Maintainance', 'maintainances', {}, false)
        }]
      }]
    });
    if (!guestHouse) {
      const error = `Guest house with id ${guestHouseId} does not exist`;
      return Error.handleError(error, 404, res);
    }
    res.status(200).json({
      guestHouse
    });
  }


  static async updateBeds(rooms, res) {
    const updatedBeds = await Promise.all(
      rooms.map(async (room) => {
        let availableBedNames;
        const roomId = room.id;
        const newBedNumbers = Number(room.bedCount);
        const BookedBeds = await models.Bed.findAll({ where: { roomId, booked: true }, raw: true });
        if (BookedBeds.length > newBedNumbers) {
          return Error.handleError(`There are currently ${BookedBeds.length} booked beds, 
          unable to update bed numbers`, 409, res);
        }
        const foundBeds = await models.Bed.findAll({ where: { roomId }, raw: true });
        if (newBedNumbers === foundBeds.length) { return foundBeds; }
        let numberOfBedsToCreate;
        if (newBedNumbers > foundBeds.length) {
          numberOfBedsToCreate = Math.abs(newBedNumbers - foundBeds.length);
          availableBedNames = BedName.getAvailableBedNames(newBedNumbers, foundBeds);
        } else {
          await models.Bed.destroy({ where: { roomId, booked: false } });
          availableBedNames = (BookedBeds.length)
            ? BedName.getAvailableBedNames(foundBeds.length, BookedBeds) : [];
          numberOfBedsToCreate = Math.abs(newBedNumbers - BookedBeds.length);
        }
        const newBeds = [];
        for (let i = 0; i < numberOfBedsToCreate; i += 1) {
          const newBed = { roomId, bedName: availableBedNames[i] || `bed ${i + 1}` };
          newBeds.push(newBed);
        }
        await models.Bed.bulkCreate(newBeds);
        const createdBeds = await models.Bed.findAll({ where: { roomId } });
        return createdBeds;
      })
    );
    return updatedBeds;
  }

  static async editGuestHouse(req, res) {
    try {
      const {
        houseName, location, bathRooms, imageUrl, rooms
      } = req.body;
      await GuestHouseTransactions.editGustHouseTransaction(
        req, res, houseName, location, bathRooms, imageUrl, rooms
      );
    } catch (error) {
      /* istanbul ignore next */
      return Error.handleError('Server Error', 500, res);
    }
  }

  static async getAvailableRooms(req, res) {
    const {
      arrivalDate, departureDate, location, gender
    } = req.query;

    const beds = await RoomsManager.fetchAvailableRooms({
      arrivalDate, departureDate, location, gender
    });

    return res.status(200).json({
      success: true,
      message: 'Available rooms fetched',
      beds,
    });
  }

  static async disableOrRestoreGuesthouse(req, res) {
    try {
      const { id } = req.params;
  
      const guestHouse = await models.GuestHouse.findOne({
        where: {
          id
        }
      });
  
      if (!guestHouse) {
        return res.status(404).json({
          success: false,
          message: 'This Guest house does not exist'
        });
      }
      const result = await guestHouse.update({
        disabled: !(guestHouse.disabled)
      });
      return res.status(201).json({
        success: true,
        message: result.disabled === true
          ? 'Guest house has been successfully disabled'
          : 'Guest house has been successfully restored',
        result
      });
    } catch (error) {
      /* istanbul ignore next */
      return Error.handleError('Server Error', 500, res);
    }
  }

  static async getDisabledGuestHouses(req, res) {
    try {
      const guestHouses = await models.GuestHouse.findAll({
        where: { disabled: true },
        include: [{
          as: 'rooms',
          model: models.Room,
          where: { isDeleted: false }
        }],
      });
      return res.status(200).json({
        success: true,
        message: 'Disabled guesthouses retrieved successfully',
        guestHouses
      });
    } catch (error) { /* istanbul ignore next */
      Error.handleError(error, 500, res);
    }
  }
}

export default GuestHouseController;

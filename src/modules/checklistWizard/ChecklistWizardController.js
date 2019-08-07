/* eslint-disable no-await-in-loop */
import models from '../../database/models';
import WizardUtils from './wizardUtils';
import Error from '../../helpers/Error';
import circularReplacer from '../../helpers/circularReplacer';
import TripsController from '../trips/TripsController';

class ChecklistWizardController {
  static async createChecklist(req, res) {
    try {
      const newChecklist = await models.Checklist.create({
        createdBy: req.user.UserInfo.id,
        name: WizardUtils.generateName(req.body.origin, req.body.destinations),
        config: req.body.config,
      }, {
        returning: true,
        include: [{
          model: models.ChecklistOrigin,
          as: 'origin',
          include: [{
            model: models.Country,
            as: 'country'
          }, {
            model: models.TravelRegions,
            as: 'region'
          }]
        }, {
          model: models.ChecklistDestinations,
          as: 'destinations',
          include: [{
            model: models.Country,
            as: 'country'
          }, {
            model: models.TravelRegions,
            as: 'region'
          }]
        }]
      });

      const { country, region } = req.body.origin;

      await WizardUtils.savePlaces(newChecklist.id, country, region, 'ChecklistOrigin');

      const { countries, regions } = req.body.destinations;

      if (countries) {
        await Promise.all(countries.map(item => WizardUtils.savePlaces(newChecklist.id, item, undefined, 'ChecklistDestinations')));
      } else {
        await Promise.all(regions.map(item => WizardUtils.savePlaces(newChecklist.id, undefined, item, 'ChecklistDestinations')));
      }

      await newChecklist.reload();

      return res.status(201).json({
        success: true,
        message: 'Checklist created successfully',
        newChecklist
      });
    } catch (error) { /* istanbul ignore next */
      return Error.handleError('Server Error', 500, res);
    }
  }

  static async getAllChecklists(req, res) {
    try {
      const row = await models.Checklist.findAll({
        attributes: { exclude: ['createdBy'] },
        include: [
          {
            model: models.ChecklistDestinations,
            as: 'destinations',
            include: [{
              model: models.Country,
              as: 'country'
            }, {
              model: models.TravelRegions,
              as: 'region'
            }]
          },
          {
            model: models.ChecklistOrigin,
            as: 'origin',
            include: [{
              model: models.Country,
              as: 'country'
            }, {
              model: models.TravelRegions,
              as: 'region'
            }]
          },
          {
            model: models.User,
            as: 'user',
          }
        ]
      });
      const removeCyclicStructure = JSON.stringify(row, circularReplacer());
      const newRow = JSON.parse(removeCyclicStructure);
      const checklists = newRow.map((checklist) => {
        const { user, ...rest } = checklist;
        return {
          ...rest,
          createdBy: user
        };
      });
      
      return res.status(200).json({
        success: true,
        checklists
      });
    } catch (error) { /* istanbul ignore next */
      return Error.handleError('Server Error', 500, res);
    }
  }

  static async getChecklistByRequest(req, res) {
    try {
      const { requestId } = req.params;
    
      const trips = await TripsController.getTripsByRequestId(requestId, res);
      const row = await WizardUtils.getChecklistByTrip(trips);

      const removeCyclicStructure = JSON.stringify(row, circularReplacer());
      const newRow = JSON.parse(removeCyclicStructure);

      const checklists = newRow.map(checklist => ({
        tripId: checklist.tripId,
        id: checklist.id,
        name: checklist.name,
        config: checklist.config,
        ...checklist.dataValues
      }));
  
      res.status(200).json({
        success: true,
        message: 'Successfully retrieved checklist',
        checklists
      });
    } catch (error) { /* istanbul ignore next */
      return Error.handleError(error, 500, res);
    }
  }
}

export default ChecklistWizardController;

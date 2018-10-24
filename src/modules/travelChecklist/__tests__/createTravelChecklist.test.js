import supertest from 'supertest';
import models from '../../../database/models';
import app from '../../../app';
import Utils from '../../../helpers/Utils';
import { role } from '../../userRole/__tests__/mocks/mockData';


const request = supertest;
const invalidToken = 'eyJhbGciOiJSUzI1NiIsInR5cCI6Ikp';
const payload = {
  UserInfo: {
    id: '--MUyHJmKrxA90lPNQ1FOLNm',
    email: 'captan.ameria@andela.com',
    name: 'Samuel Kubai',
  },
};

const nonTravelAdmin = {
  UserInfo: {
    id: '-MUnaemKrxA90lPNQs1FOLNm',
    email: 'captan.egypt@andela.com',
    name: 'Sweetness',
  }
};

const userMock = [
  {
    id: 20000,
    fullName: 'Samuel Kubai',
    email: 'captan.ameria@andela.com',
    userId: '--MUyHJmKrxA90lPNQ1FOLNm',
    location: 'Lagos',
    createdAt: '2018-08-16 012:11:52.181+01',
    updatedAt: '2018-08-16 012:11:52.181+01'
  },
  {
    id: 20001,
    fullName: 'Sweetness',
    email: 'captan.egypt@andela.com',
    userId: '-MUnaemKrxA90lPNQs1FOLNm',
    location: 'Lagos',
    createdAt: '2018-08-16 012:11:52.181+01',
    updatedAt: '2018-08-16 012:11:52.181+01'
  }
];

const userRole = [{
  userId: 20000,
  roleId: 29187
}, {
  userId: 20001,
  roleId: 401938
}];

const token = Utils.generateTestToken(payload);
const nonTravelAdminToken = Utils.generateTestToken(nonTravelAdmin);

describe('Travel ChecklistController', () => {
  beforeAll(async () => {
    await models.User.destroy({ force: true, truncate: { cascade: true } });
    await models.Role.destroy({ force: true, truncate: { cascade: true } });
    await models.UserRole.destroy({ force: true, truncate: { cascade: true } });
    await models.ChecklistItem.destroy({ force: true, truncate: { cascade: true } });
    await models.ChecklistItemResource.destroy({ force: true, truncate: { cascade: true } });
    await models.ChecklistSubmission.destroy({ force: true, truncate: { cascade: true } });

    await models.Role.bulkCreate(role);
    await models.User.bulkCreate(userMock);
    await models.UserRole.bulkCreate(userRole);
  });

  afterAll(async () => {
    await models.User.destroy({ force: true, truncate: { cascade: true } });
    await models.Role.destroy({ force: true, truncate: { cascade: true } });
    await models.UserRole.destroy({ force: true, truncate: { cascade: true } });
    await models.ChecklistItem.destroy({ force: true, truncate: { cascade: true } });
    await models.ChecklistItemResource.destroy({ force: true, truncate: { cascade: true } });
    await models.ChecklistSubmission.destroy({ force: true, truncate: { cascade: true } });
  });
  describe('POST /api/v1/checklists', () => {
    it('should not create a checklist if the user does not provide a token',
      async () => {
        const expectedResponse = {
          status: 401,
          body: {
            success: false,
            error: 'Please provide a token',
          },
        };
        const res = await request(app)
          .post('/api/v1/checklists');

        expect(res.statusCode).toEqual(expectedResponse.status);
        expect(res.body).toEqual(expectedResponse.body);
      });
    it('should not create a checklist if the user provides an invalid token',
      async () => {
        const expectedResponse = {
          status: 401,
          body: {
            success: false,
            error: 'Token is not valid',
          },
        };
        const res = await request(app)
          .post('/api/v1/checklists')
          .set('Authorization', invalidToken);
        expect(res.statusCode).toEqual(expectedResponse.status);
        expect(res.body).toEqual(expectedResponse.body);
      });

    it('should not create a checklist if the user is not a travel or super admin',
      async () => {
        const expectedResponse = {
          status: 403,
          body: {
            success: false,
            error: 'You don\'t have access to perform this action',
          },
        };
        const res = await request(app)
          .post('/api/v1/checklists')
          .set('Authorization', nonTravelAdminToken);

        expect(res.statusCode).toEqual(expectedResponse.status);
        expect(res.body).toEqual(expectedResponse.body);
      });
    it('should validate checklist item data', async () => {
      const expectedResponse = {
        status: 422,
        body: {
          success: false,
          errors: [
            {
              location: 'body',
              param: 'name',
              msg: 'Name is required',
            },
            {
              location: 'body',
              param: 'resources[0].label',
              msg: 'Label is required',
            },
            {
              location: 'body',
              param: 'resources[0].link',
              msg: 'Link is required'
            },
          ]
        },
      };
      const res = await request(app)
        .post('/api/v1/checklists')
        .set('Authorization', token)
        .send({
          name: '',
          requiresFiles: false,
          resources: [{ label: '', link: '' }]
        });

      // expect(res.statusCode).toEqual(expectedResponse.status);
      expect(res.body).toMatchObject(expectedResponse.body);
    });
    it('should create a new travel checklist item with a resource', async () => {
      const expectedResponse = {
        status: 201,
        body: {
          success: true,
          message: 'Check list created successfully',
          name: 'Visa application',
          requiresFiles: true,
          destinationName: 'Lagos, Nigeria',
          resources: [{ label: 'Visa', link: 'http://myvisa.test' }]
        },
      };
      const res = await request(app)
        .post('/api/v1/checklists')
        .set('Authorization', token)
        .send({
          name: 'Visa application',
          requiresFiles: true,
          destinationName: 'Nairobi, Kenya',
          resources: [{ label: 'Visa', link: 'http://myvisa.test' }]
        });
      expect(res.statusCode).toEqual(expectedResponse.status);
      expect(res.body).toMatchObject(expectedResponse.body);
    });
    it('should create a new travel checklist item without a resource', async () => {
      const expectedResponse = {
        status: 201,
        body: {
          success: true,
          message: 'Check list created successfully',
          name: 'Visa application',
          requiresFiles: true,
          destinationName: 'Lagos, Nigeria',
          resources: []
        },
      };
      const res = await request(app)
        .post('/api/v1/checklists')
        .set('Authorization', token)
        .send({
          name: 'Visa application',
          requiresFiles: true,
          destinationName: 'Nairobi, Kenya',
          resources: []
        });
      expect(res.statusCode).toEqual(expectedResponse.status);
      expect(res.body).toMatchObject(expectedResponse.body);
    });
  });
});

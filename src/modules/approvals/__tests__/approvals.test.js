/* eslint global-require: 0 */
/* eslint no-unused-vars: 0 */
/* eslint one-var: 0 */
/* eslint one-var-declaration-per-line: 0 */
/* eslint no-shadow: 0 */
import supertest from 'supertest';
import models from '../../../database/models';
import { mockRouterMiddleware, mockApprovals } from './mocks/mockModules';

/* SERVER INTEGRATION TESTS */
describe('server integration tests', () => {
  const testClient = supertest;
  let middleware, ApprovalsController, app;

  beforeAll(() => {
    mockRouterMiddleware();
    mockApprovals();
    // fetch  modules after mocking
    middleware = require('../../../middlewares').default;
    app = require('../../../app').default;
    ApprovalsController = require('../ApprovalsController').default;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  it('calls authenticate to authenticate user', (done) => {
    testClient(app)
      .get('/api/v1/approvals')
      .end((err, res) => {
        expect(middleware.authenticate).toHaveBeenCalledTimes(1);
        done();
      });
  });

  it('calls validateDirectReport to check requesters manaager', (done) => {
    testClient(app)
      .put('/api/v1/approvals/1')
      .end((err, res) => {
        expect(middleware.validateDirectReport).toHaveBeenCalledTimes(1);
        done();
      });
  });

  it('validates query parameters before controller handles request', (done) => {
    const validator = middleware.Validator.validateGetRequests;
    testClient(app)
      .get('/api/v1/approvals')
      .end((err, res) => {
        expect(validator).toHaveBeenCalledTimes(1);
        expect(ApprovalsController.getUserApprovals).toHaveBeenCalledTimes(1);
        done();
      });
  });

  it('validates newStatus parameters before controller handles request',
    (done) => {
      const statusValidator = middleware.Validator.validateStatus;
      testClient(app)
        .put('/api/v1/approvals/1')
        .send({ newStatus: 'Approved' })
        .end((err, res) => {
          expect(statusValidator).toHaveBeenCalledTimes(1);
          expect(ApprovalsController.updateRequestStatus)
            .toHaveBeenCalledTimes(1);
          done();
        });
    });

  it('calls getUserApprovals after authentication', (done) => {
    testClient(app)
      .get('/api/v1/approvals')
      .end((err, res) => {
        expect(middleware.authenticate).toHaveBeenCalledTimes(1);
        expect(ApprovalsController.getUserApprovals).toHaveBeenCalledTimes(1);
        done();
      });
  });

  it('calls updateRequestStatus after authentication', (done) => {
    testClient(app)
      .put('/api/v1/approvals/1')
      .end((err, res) => {
        expect(middleware.authenticate).toHaveBeenCalledTimes(1);
        expect(ApprovalsController.updateRequestStatus)
          .toHaveBeenCalledTimes(1);
        done();
      });
  });
});

/* APPROVALS CONTROLLER UNIT TESTS */
describe('ApprovalsController unit tests', () => {
  let UnmockedApprovalsController, json, status, res, req;
  const approverId = '-LJV4b1QTCYewOtk5F63';

  beforeAll(() => {
    jest.unmock('../ApprovalsController');
    // fetch module after unmocking
    UnmockedApprovalsController = require('../ApprovalsController').default;
    // spies
    json = jest.fn();
    status = jest.fn(() => ({ json }));
    res = { status };
    req = { query: {}, user: { UserInfo: { id: approverId } } };
  });

  afterAll(() => {
    jest.clearAllMocks();
    jest.resetModules();
  });

  it('calls status and json methods to generate response', async (done) => {
    await UnmockedApprovalsController.getUserApprovals(req, res);
    expect(status).toHaveBeenCalledTimes(1);
    expect(json).toHaveBeenCalledTimes(1);
    done();
  });

  it('returns approver\'s decision in place of the request\'s status', () => {
    const request = { status: 'Rejected' };
    const approval = { status: 'Approved', Request: { ...request } };
    // approval: is a request with the status of the approver's decision
    const result = UnmockedApprovalsController.fillWithRequestData(approval);
    expect(result).toEqual({ status: 'Approved' });
  });
});

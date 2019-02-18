import request from 'supertest';
import axios from 'axios';
import moxios from 'moxios';
import app from '../../../app';
import models from '../../../database/models';
import {
  role,
  user,
  userRole,
  newRole,
  profile,
  userMock,
  userRoles,
} from './mocks/mockData';
import Utils from '../../../helpers/Utils';

const payload = {
  UserInfo: {
    id: '-MUyHJmKrxA90lPNQ1FOLNm',
    fullName: 'captain america',
    name: 'captain america',
    email: 'captain.america@andela.com',
    picture: 'fake.png'
  },
};

const payload2 = {
  UserInfo: {
    id: '-MUyHJmKrxA90lPNQ1FOLNm',
    fullName: 'captain america',
    name: 'captain america',
    email: 'captain.@andela.com',
    picture: 'fake.png'
  },
};

const payload3 = {
  UserInfo: {
    id: '-MUyHJmKrxA90lPNQ1FOLNm',
    fullName: 'black window ',
    name: 'black window ',
    email: 'black.window@andela.com',
    picture: 'fake.png'
  },
};

const payload4 = {
  UserInfo: {
    id: '-jdif34444',
    fullName: 'Nice Guy ',
    name: 'Nice Guy ',
    email: 'nice.guy@andela.com',
    picture: 'fake.png'
  },
};

const payload5 = {
  UserInfo: {
    id: '-jdif34444',
    fullName: 'Nice Guy ',
    name: 'Nice Guy ',
    email: 'nice.guy@gmail.com',
    picture: 'fake.png'
  },
};

const payload6 = {
  UserInfo: {
    fullName: 'Nice Guy ',
    name: 'Nice Guy ',
    email: 'nice.guy@andela.com',
    picture: 'fake.png'
  },
};

const payload7 = {
  UserInfo: {
    ...user.user1,
    name: user.user1.fullName,
    id: user.user1.userId
  }
};
const payload8 = {
  UserInfo: {
    ...user.user2,
    name: user.user2.fullName,
    id: user.user2.userId
  }
};
const updateRoleData = {
  id: 10948,
  roleName: 'Super Administrator',
  description: 'Can perform all task on travela',
  createdAt: '2018-08-16 012:11:52.181+01',
  updatedAt: '2018-08-16 012:11:52.181+01'
};

const token = Utils.generateTestToken(payload);
const token2 = Utils.generateTestToken(payload2);
const token3 = Utils.generateTestToken(payload3);
const tokenNonAndelan = Utils.generateTestToken(payload5);
const tokenNoUserId = Utils.generateTestToken(payload6);
const newUserToken = Utils.generateTestToken(payload7);
const newUser2Token = Utils.generateTestToken(payload8);
const unSeededUserToken = Utils.generateTestToken(payload4);

describe('User Role Test', () => {
  beforeAll(async () => {
    moxios.install();
    await models.User.destroy({ force: true, truncate: { cascade: true } });
    await models.Role.destroy({ force: true, truncate: { cascade: true } });
    await models.UserRole.destroy({ force: true, truncate: { cascade: true } });
    process.env.DEFAULT_ADMIN = 'captain.america@andela.com';
    await models.Role.bulkCreate(role);
    await models.User.bulkCreate(userMock);
    await models.UserRole.bulkCreate(userRoles);
  });

  afterAll(async () => {
    moxios.uninstall();
    await models.User.destroy({ force: true, truncate: { cascade: true } });
    await models.Role.destroy({ force: true, truncate: { cascade: true } });
    await models.UserRole.destroy({ force: true, truncate: { cascade: true } });
  });

  it('should return 401 Unauthorized users', (done) => {
    request(app)
      .get('/api/v1/user')
      .expect(401)
      .end((err) => {
        if (err) {
          done(err);
        }
        done();
      });
  });

  it('should return error if field is empty when adding a new user', (done) => {
    request(app)
      .post('/api/v1/user')
      .set('Content-Type', 'application/json')
      .set('authorization', '')
      .send({ location: 'Kampala' })
      .expect(401)
      .end((err, res) => {
        expect(res.body.error).toEqual('Please provide a token');
        expect(res.body.success).toEqual(false);
        if (err) return done(err);
        done();
      });
  });

  it('should return error if email is not an andela email address', (done) => {
    request(app)
      .post('/api/v1/user')
      .set('Content-Type', 'application/json')
      .set('authorization', tokenNonAndelan)
      .send({ location: 'kampala' })
      .expect(400)
      .end((err, res) => {
        expect(res.body.success).toEqual(false);
        if (err) return done(err);
        done();
      });
  });

  it('should return error if user Id is empty', (done) => {
    request(app)
      .post('/api/v1/user')
      .set('Content-Type', 'application/json')
      .set('authorization', tokenNoUserId)
      .send({ location: 'Lagos' })
      .expect(400)
      .end((err, res) => {
        expect(res.body.success).toEqual(false);
        expect(res.body.message).toEqual('User Id required');
        if (err) return done(err);
        done();
      });
  });

  it('should add a new user to the database', (done) => {
    moxios.stubRequest(`${process.env.ANDELA_PROD_API}/users?email=${user.user1.email}`, {
      status: 200,
      response: {
        values: [{
          bamboo_hr_id: '01',
        }]
      }
    });
    moxios.stubRequest(process.env.BAMBOOHR_API.replace('{bambooHRId}', '01'), {
      status: 200,
      response: {
        workEmail: 'lisa.doe@andela.com',
        supervisorEId: '92',
        location: 'Nigeria'
      }
    });
    moxios.stubRequest(process.env.BAMBOOHR_API.replace('{bambooHRId}', '92'), {
      status: 200,
      response: {
        id: '92',
        displayName: 'ssewilliam',
        firstName: 'William',
        lastName: 'Sserubiri',
        jobTitle: 'Engineering Team Lead',
        department: 'Partner-Programs',
        location: 'Kenya',
        workEmail: 'william.sserubiri@andela.com',
        supervisorEId: '9',
        supervisor: 'Samuel Kubai'
      }
    });
    moxios.stubRequest(`${process.env.ANDELA_PROD_API}/users?email=william.sserubiri@andela.com`, {
      status: 200,
      response: {
        values: [{
          email: 'william.sserubiri@andela.com',
          name: 'ssewilliam',
          id: '92',
          location: {
            name: 'Kampala'
          },
          picture: 'http//:gif.jpg'
        }]
      }
    });
    request(app)
      .post('/api/v1/user')
      .set('Content-Type', 'application/json')
      .set('authorization', newUserToken)
      .send({ location: user.user1.location })
      .expect(201)
      .end((err, res) => {
        expect(res.body.result).toHaveProperty('userId');
        expect(res.body.result).toHaveProperty('fullName');
        expect(res.body.result).toHaveProperty('email');
        expect(res.body.result).toHaveProperty('location');
        expect(res.body.result.email).toEqual(user.user1.email);
        expect(res.body.result.fullName).toEqual(user.user1.fullName);
        expect(res.body.result.location).toEqual(user.user1.location);
        expect(res.body.success).toEqual(true);
        if (err) return done(err);
        done();
      });
  });

  it('should add another new user to the database', (done) => {
    moxios.stubRequest(`${process.env.ANDELA_PROD_API}/users?email=${user.user2.email}`, {
      status: 200,
      response: {
        values: [{
          bamboo_hr_id: '01',
        }]
      }
    });
    moxios.stubRequest(process.env.BAMBOOHR_API.replace('{bambooHRId}', '01'), {
      status: 200,
      response: {
        workEmail: 'lisa.doe@andela.com',
        supervisorEId: '92',
        location: 'Nigeria'
      }
    });
    moxios.stubRequest(process.env.BAMBOOHR_API.replace('{bambooHRId}', '92'), {
      status: 200,
      response: {
        id: '92',
        displayName: 'ssewilliam',
        firstName: 'William',
        lastName: 'Sserubiri',
        jobTitle: 'Engineering Team Lead',
        department: 'Partner-Programs',
        location: 'Kenya',
        workEmail: 'william.sserubiri@andela.com',
        supervisorEId: '9',
        supervisor: 'Samuel Kubai'
      }
    });
    moxios.stubRequest(`${process.env.ANDELA_PROD_API}/users?email=william.sserubiri@andela.com`, {
      status: 200,
      response: {
        values: [{
          email: 'william.sserubiri@andela.com',
          name: 'ssewilliam',
          id: '92',
          location: {
            name: 'Kampala'
          },
          picture: 'http//:gif.jpg'
        }]
      }
    });
    request(app)
      .post('/api/v1/user')
      .set('Content-Type', 'application/json')
      .set('authorization', newUser2Token)
      .send({ location: user.user2.location })
      .expect(201)
      .end((err, res) => {
        expect(res.body.result).toHaveProperty('userId');
        expect(res.body.result).toHaveProperty('fullName');
        expect(res.body.result).toHaveProperty('email');
        expect(res.body.result.email).toEqual(user.user2.email);
        expect(res.body.result.fullName).toEqual(user.user2.fullName);
        expect(res.body.success).toEqual(true);
        if (err) return done(err);
        done();
      });
  });

 
  it('should return only one user from the database', (done) => {
    request(app)
      .get('/api/v1/user/JNDVNFSFDK')
      .set('Content-Type', 'application/json')
      .set('authorization', token)
      .expect(200)
      .end((err, res) => {
        expect(res.body.success).toEqual(true);
        if (err) return done(err);
        done();
      });
  });

  it(`should throw 404 error when getting a user that does
  not exist in the database`, (done) => {
    request(app)
      .get('/api/v1/user/JNDVNFSFDKuytom')
      .set('Content-Type', 'application/json')
      .set('authorization', token)
      .expect(404)
      .end((err, res) => {
        expect(res.body.success).toEqual(false);
        expect(res.body.error).toEqual('User not found');
        if (err) return done(err);
        done();
      });
  });

  it('should return error if login user does not exist in database when changing user role', (done) => {
    request(app)
      .put('/api/v1/user/role/update')
      .set('Content-Type', 'application/json')
      .set('authorization', token2)
      .send(userRole.superAdminRole)
      .expect(400)
      .end((err, res) => {
        expect(res.body.success).toEqual(false);
        expect(res.body.message).toEqual(
          'You are not signed in to the application',
        );
        if (err) return done(err);
        done();
      });
  });

  it('should return error when changing user role and user is not a super admin', (done) => {
    request(app)
      .put('/api/v1/user/role/update')
      .set('Content-Type', 'application/json')
      .set('authorization', token)
      .send(userRole.superAdminRole)
      .expect(403)
      .end((err, res) => {
        expect(res.body.success).toEqual(false);
        expect(res.body.error)
          .toEqual('You don\'t have access to perform this action');
        if (err) return done(err);
        done();
      });
  });
  it('should throw error if user does not exist in the database when user is set to super admin', (done) => {
    request(app)
      .put('/api/v1/user/admin')
      .set('Content-Type', 'application/json')
      .set('authorization', token2)
      .expect(400)
      .end((err, res) => {
        expect(res.body.success).toEqual(false);
        expect(res.body.message).toEqual('Email does not exist in Database');
        if (err) return done(err);
        done();
      });
  });

  it('should change user to super admin', (done) => {
    request(app)
      .put('/api/v1/user/admin')
      .set('Content-Type', 'application/json')
      .set('authorization', token)
      .expect(200)
      .end((err, res) => {
        expect(res.body.success).toEqual(true);
        expect(res.body.message).toEqual('Your role has been Updated to a Super Admin');
        if (err) return done(err);
        done();
      });
  });

  it('should throw if email does not match process env when changing user to super admin', (done) => {
    request(app)
      .put('/api/v1/user/admin')
      .set('Content-Type', 'application/json')
      .set('authorization', token3)
      .send(userRole.superAdminRole)
      .expect(409)
      .end((err, res) => {
        expect(res.body.success).toEqual(false);
        expect(res.body.message).toEqual('Email does not match');
        if (err) return done(err);
        done();
      });
  });

  it('should updated user role to admin', (done) => {
    request(app)
      .put('/api/v1/user/role/update')
      .set('Content-Type', 'application/json')
      .set('authorization', token)
      .send(userRole.superAdminRole)
      .expect(200)
      .end((err, res) => {
        expect(res.body.success).toEqual(true);
        expect(res.body.message).toEqual('Role updated successfully');
        if (err) return done(err);
        done();
      });
  });

  it('should update user profile', (done) => {
    request(app)
      .put('/api/v1/user/-MUyHJmKrxA90lPNQ1FOLNm/profile')
      .set('Content-Type', 'application/json')
      .set('authorization', token)
      .send(profile.profile1)
      .expect(200)
      .end((err, res) => {
        expect(res.body.success).toEqual(true);
        expect(res.body.message).toEqual('Profile updated successfully');
        if (err) return done(err);
        done();
      });
  });

  it('should update user profile including their location', (done) => {
    request(app)
      .put('/api/v1/user/-MUyHJmKrxA90lPNQ1FOLNm/profile')
      .set('authorization', token)
      .send({ ...profile.profile1, location: 'San Fransisco' })
      .expect(200)
      .end((err, res) => {
        expect(res.body.success).toEqual(true);
        expect(res.body.message).toEqual('Profile updated successfully');
        expect(res.body.result.location).toEqual('San Fransisco');
        if (err) return done(err);
        done();
      });
  });
  it('should not update user profile of another user', (done) => {
    request(app)
      .put('/api/v1/user/-MUyHJmKrxA/profile')
      .set('Content-Type', 'application/json')
      .set('authorization', token)
      .send(profile.profile1)
      .expect(403)
      .end((err, res) => {
        expect(res.body.success).toEqual(false);
        expect(res.body.message).toEqual('You cannot perform this operation');
        if (err) return done(err);
        done();
      });
  });

  it('should get all users in the database', (done) => {
    request(app)
      .get('/api/v1/user')
      .set('Content-Type', 'application/json')
      .set('authorization', token)
      .expect(200)
      .end((err, res) => {
        expect(res.body.success).toEqual(true);
        if (err) return done(err);
        done();
      });
  });

  it('should get all users emails in the database', (done) => {
    request(app)
      .get('/api/v1/user')
      .set('Content-Type', 'application/json')
      .set('authorization', token)
      .expect(200)
      .end((err, res) => {
        expect(res.body.success).toEqual(true);
        if (err) return done(err);
        done();
      });
  });

  it('should throw an error if the gender is wrong', (done) => {
    request(app)
      .put('/api/v1/user/JNDVNFSFDK/profile')
      .set('Content-Type', 'application/json')
      .set('authorization', token)
      .send(profile.profile2)
      .expect(400)
      .end((err, res) => {
        expect(res.body.success).toEqual(false);
        if (err) return done(err);
        done();
      });
  });

  it('should throw error when field is empty when super admin is adding new role', (done) => {
    request(app)
      .post('/api/v1/user/role')
      .set('Content-Type', 'application/json')
      .set('authorization', token)
      .send(userRole.newRole)
      .expect(422)
      .end((err, res) => {
        expect(res.body.success).toEqual(false);
        expect(res.body.message).toEqual('Validation failed');
        if (err) return done(err);
        done();
      });
  });

  it('should return error if email does not exist when updating user role', (done) => {
    axios.get = jest.fn(() => Promise.resolve({
      data: {
        values: [],
        total: 0
      }
    }));
    request(app)
      .put('/api/v1/user/role/update')
      .set('Content-Type', 'application/json')
      .set('authorization', token)
      .send(userRole.superAdminRole2)
      .expect(404)
      .end((err, res) => {
        expect(res.body.success).toEqual(false);
        expect(res.body.error).toEqual('Email does not exist');
        if (err) return done(err);
        done();
      });
  });

  it('should change the role of a user that has not logged in for the first time', async (done) => {
    axios.get = jest.fn(() => Promise.resolve({
      data: {
        values: [
          {
            id: 'jdddd',
            email: 'black.widow@andela.com',
            first_name: 'Black',
            last_name: 'Widow',
            name: 'Black Widow',
            picture: 'photo.jpg?sz=50Vn',
            status: 'active',
            location: {
              name: 'Wakanda'
            }
          }
        ],
        total: 1,
      }
    }));

    request(app)
      .put('/api/v1/user/role/update')
      .set('Content-Type', 'application/json')
      .set('Authorization', token)
      .send({ email: 'black.widow@andela.com', roleName: 'manager' })
      .end((err, res) => {
        expect(res.body.result.email).toEqual('black.widow@andela.com');
        expect(res.body.result.fullName).toEqual('Black Widow');
        if (err) return done(err);
        done();
      });
  });

  it('should throw an error if the user does not exist', (done) => {
    request(app)
      .put('/api/v1/user/-jdif34444/profile')
      .set('Content-Type', 'application/json')
      .set('authorization', unSeededUserToken)
      .send(profile.profile1)
      .expect(400)
      .end((err, res) => {
        expect(res.body.success).toEqual(false);
        expect(res.body.message).toEqual('User does not exist');
        if (err) return done(err);
        done();
      });
  });

  it('should throw error when role Name is not provided when adding new role for user ', (done) => {
    request(app)
      .put('/api/v1/user/role/update')
      .set('Content-Type', 'application/json')
      .set('authorization', token)
      .send(newRole.saveSuperAdminRole)
      .expect(422)
      .end((err, res) => {
        expect(res.body.success).toEqual(false);
        expect(res.body.message).toEqual('Validation failed');
        if (err) return done(err);
        done();
      });
  });

  it('should throw error when role does not exist when updating user role ', (done) => {
    request(app)
      .put('/api/v1/user/role/update')
      .set('Content-Type', 'application/json')
      .set('authorization', token)
      .send(userRole.managerRole)
      .expect(404)
      .end((err, res) => {
        expect(res.body.success).toEqual(false);
        expect(res.body.error).toEqual('Role does not exist');
        if (err) return done(err);
        done();
      });
  });

  it('should throw error if role already exist when adding  new role when user is super admin ', (done) => {
    request(app)
      .post('/api/v1/user/role')
      .set('Content-Type', 'application/json')
      .set('authorization', token)
      .send(newRole.traveTeamRole)
      .expect(409)
      .end((err, res) => {
        expect(res.body.success).toEqual(false);
        expect(res.body.message).toEqual('Role already exist');
        if (err) return done(err);
        done();
      });
  });

  describe('Role Test', () => {
    it('should add new role when user is super admin ', (done) => {
      request(app)
        .post('/api/v1/user/role')
        .set('Content-Type', 'application/json')
        .set('authorization', token)
        .send(newRole.saveSuperAdminRole)
        .expect(201)
        .end((err, res) => {
          expect(res.body.success).toEqual(true);
          expect(res.body.message).toEqual('Role created successfully');
          if (err) return done(err);
          done();
        });
    });

    it('should update role when user is super admin', (done) => {
      request(app)
        .patch('/api/v1/user/role/10948')
        .set('Content-Type', 'application/json')
        .set('authorization', token)
        .send(updateRoleData)
        .expect(200)
        .end((err, res) => {
          expect(res.body.success).toEqual(true);
          expect(res.body.message).toEqual('User role updated successfully');
          if (err) return done(err);
          done();
        });
    });

    it('should return error message when wrong role id is passed', (done) => {
      request(app)
        .patch('/api/v1/user/role/1094')
        .set('Content-Type', 'application/json')
        .set('authorization', token)
        .send(updateRoleData)
        .expect(404)
        .end((err, res) => {
          expect(res.body.success).toEqual(false);
          expect(res.body.message).toEqual('User role with that Id does not exist');
          if (err) return done(err);
          done();
        });
    });

    it('should get all roles in the database', (done) => {
      request(app)
        .get('/api/v1/user/roles')
        .set('Content-Type', 'application/json')
        .set('authorization', token)
        .expect(200)
        .end((err, res) => {
          expect(res.body.success).toEqual(true);
          if (err) return done(err);
          done();
        });
    });

    it('should return error if params is not a integer', (done) => {
      request(app)
        .get('/api/v1/user/roles/irfir')
        .set('Content-Type', 'application/json')
        .set('authorization', token)
        .expect(400)
        .end((err, res) => {
          expect(res.body.success).toEqual(false);
          expect(res.body.message).toEqual('Params must be an integer');
          if (err) return done(err);
          done();
        });
    });

    it('should return only one role from the database', (done) => {
      request(app)
        .get('/api/v1/user/roles/10948')
        .set('Content-Type', 'application/json')
        .set('authorization', token)
        .expect(200)
        .end((err, res) => {
          expect(res.body.success).toEqual(true);
          if (err) return done(err);
          done();
        });
    });
  });
});

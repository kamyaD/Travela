import Centers from '../centers';
import models from '../../database/models';

const centers = [
  {
    id: 1,
    location: 'Kenya',
    createdAt: '2018-11-12',
    updatedAt: '2018-11-12'
  },
  {
    id: 2,
    location: 'Rwanda',
    createdAt: '2018-11-12',
    updatedAt: '2018-11-12'
  }
];

describe('get center id', () => {
  beforeAll(async () => {
    await models.Center.bulkCreate(centers);
  });
  it('Should return a list of ids if locations exist', async () => {
    const data = await Centers.getCenterId(['Nairobi, Kenya'], ['Kigali, Rwanda']);

    expect(data).toEqual([[1, 2]]);
  });
  it('Should return a list of undefined if locations does not exist', async () => {
    const data = await Centers.getCenterId([''], ['']);

    expect(data).toEqual([[undefined, undefined]]);
  });
});

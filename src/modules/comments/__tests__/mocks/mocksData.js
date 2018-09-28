const mockData = {
  userMock: {
    fullName: 'Samuel Kubai',
    email: 'captan.ameria@andela.com',
    userId: '--MUyHJmKrxA90lPNQ1FOLNm',
    roleId: 53019
  },
  requestsMock: [
    {
      id: '-ss60B42oZ-a',
      name: 'Ademola Ariya',
      manager: 'Samuel Kubai',
      gender: 'Male',
      department: 'TDD',
      status: 'Open',
      role: 'Software Developer',
      userId: '-LHJmKrxA8SlPNQFOVVm',
      picture: 'fakepicture.png',
      createdAt: '2018-08-16 012:11:52.181+01',
      updatedAt: '2018-08-16 012:11:52.181+01',
      tripType: 'oneWay'
    },
    {
      id: '-ss60B42oZ-b',
      name: 'Ademola Ariya',
      manager: 'Samuel Kubai',
      tripType: 'return',
      gender: 'Male',
      department: 'TDD',
      status: 'Open',
      role: 'Software Developer',
      userId: '-LHJmKrxA8SlPNQFOVVm',
      picture: 'fakepicture.png',
      createdAt: '2018-08-16 012:11:52.181+01',
      updatedAt: '2018-08-16 012:11:52.181+01',
    },
    {
      id: '-ss60B42oZ-c',
      name: 'Ademola Ariya',
      tripType: 'oneWay',
      manager: 'Samuel Kubai',
      gender: 'Male',
      department: 'TDD',
      status: 'Open',
      role: 'Software Developer',
      userId: '-LHJmKrxA8SlPNQFOVVm',
      picture: 'fakepicture.png',
      createdAt: '2018-08-16 012:11:52.181+01',
      updatedAt: '2018-08-16 012:11:52.181+01',
    },
  ],
  commentMock: {
    id: 'DOCstrange',
    comment: "I thought we agreed you'd spend only two weeks",
    isEdited: false,
    requestId: '-ss60B42oZ-a',
    userName: 'Doctor Strange',
    userEmail: 'doctor.strange@andela.com',
    picture: 'fakepicture.png',
    createdAt: '2018-08-16 012:11:52.181+01',
    updatedAt: '2018-08-16 012:11:52.181+01',
  }
};

export default mockData;

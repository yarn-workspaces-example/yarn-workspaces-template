import { sampleFunction } from './functions';

describe('sampleFunction', () => {
  it('should return the expected result', () => {
    expect(sampleFunction()).toEqual('One plus two equals 3.');
  });
});

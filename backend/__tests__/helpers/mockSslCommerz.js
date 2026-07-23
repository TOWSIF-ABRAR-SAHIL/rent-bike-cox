const mockValidate = jest.fn();

jest.mock('sslcommerz-lts', () => {
  return jest.fn().mockImplementation(() => ({
    init: jest.fn().mockResolvedValue({
      status: 'SUCCESS',
      GatewayPageURL: 'https://sandbox.sslcommerz.com/gateway',
    }),
    validate: mockValidate,
  }));
});

function setValidationResult(result) {
  mockValidate.mockResolvedValue(result);
}

function setValidationError(error) {
  mockValidate.mockRejectedValue(error);
}

module.exports = { setValidationResult, setValidationError };

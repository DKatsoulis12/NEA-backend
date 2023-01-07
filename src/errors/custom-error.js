class CustomError extends Error {
  statusCode;

  constructor(message) {
    super(message);

    // Only because we are extending a built in class
    Object.setPrototypeOf(this, CustomError.prototype);
  }

  serializeErrors() {}
}

module.exports = CustomError;

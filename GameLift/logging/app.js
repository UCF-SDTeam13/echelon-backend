
exports.lambdaHandler = async (event, context) => {
  console.log(event.Records[0].Sns);
};

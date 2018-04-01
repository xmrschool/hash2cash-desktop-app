const errorSet = new Set();

export default function writeLog(
  type: string,
  context: string,
  message: any,
  additionalInfo?: any
) {
  if (process.env.NODE_ENV !== 'production')
    errorSet.add([new Date(), type, context, message, additionalInfo]);
}

export { writeLog, errorSet };

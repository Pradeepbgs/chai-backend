import {apiError} from "../utils/apiError.js"
import {apiResponse} from "../utils/apiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"


const healthcheck = asyncHandler(async (req, res) => {
    try {
      return res.status(200).json(apiResponse(200, "OK, everything seems fine"));
    } catch (error) {
      throw new apiError(error.message, error.statusCode);
    }
  });
  

export {
    healthcheck
    }
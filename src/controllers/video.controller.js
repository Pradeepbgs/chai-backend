import { apiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import videoModel from "../models/video.model.js";
import { apiResponce } from "../utils/apiResponce.js";
import { cleanUploadedfiles } from "../utils/cleanup.videoFiles.js";


const getAllVideos = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query
  //TODO: get all videos based on query, sort, pagination

    try {

      const validSortFields = ['createdAt','title']
      const validSortTypes = ['asc','desc']
      if(sortBy && !validSortFields.includes(sortBy)) {
        throw new apiError('Invalid sort field',400)
      }
      if(sortType && !validSortTypes.includes(sortType)) {
        throw new apiError('Invalid sort type',400)
      }

      const queryObj = query ? {
        title: {$regex: new RegExp(query,'i')}
      }: {}

      const videos = await videoModel
      .find(queryObj)
      .sort({ [sortBy]: sortType === 'desc' ? -1 : 1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)

      return res.status(200).json(new apiResponce(videos, "success", 200));

    } catch (error) {
      return res
      .status(400)
      .json(new apiError(error.message, error.statusCode));
    }

})

const videoUpload = asyncHandler(async (req, res) => {
  // get the title, description, tags, thumbnail from the request body
  // get the user from req.user
  // check if the user is authenticated
  // create a new video object with the title, description, tags, thumbnail, user
  // save the video object to the database
  // return the video object
  // res.status

  const user = req.user;
  const { title, description } = req.body;

  try {
    // const videoFile = req.files?.video[0]?.path;
    let videoFile;
    if (
      req.files &&
      Array.isArray(req.files.video) &&
      req.files.video.length > 0
    ) {
      videoFile = req.files.video[0].path;
    }

    // const thumbnail = req.files?.thumbnail[0]?.path;

    let thumbnail;
    if (
      req.files &&
      Array.isArray(req.files.thumbnail) &&
      req.files.thumbnail.length > 0
    ) {
      thumbnail = req.files.thumbnail[0].path;
    }

    if (!user) return res.status(401).json(new apiError(401, "user not found"));
    if ([title, description].some((field) => field?.trim() === "")) {
      throw new apiError("All field are required", 400);
    }

    if (!videoFile) throw new apiError("video file is required");
    if (!thumbnail) throw new apiError("thumbnail file is required");

    const video = await uploadOnCloudinary(videoFile);
    if (!video) {
      cleanUploadedfiles(req.files);
      throw new apiError("video upload failed");
    }
    const thumbnailUrl = await uploadOnCloudinary(thumbnail);
    if (!thumbnailUrl) {
      cleanUploadedfiles(req.files);
      throw new apiError("thumbnail upload failed");
    }

    const uploadedVideo = await videoModel.create({
      title,
      description,
      videoFile: video.url ?? "",
      thumbnail: thumbnailUrl.url ?? "",
      owner: user._id,
    });

    return res
      .status(201)
      .json(new apiResponce(201, uploadedVideo, "video uploaded successfully"));
  } catch (error) {
    cleanUploadedfiles(req.files);
    console.log(
      "error in video.controller.js on videoupload controller" + error
    );
    return res
      .status(500)
      .json(new apiError(401, error.message || "error while uploading video"));
  }
});

const videoDetails = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  try {
    if (!videoId) {
      throw new apiError(401, "cant find video id");
    }

    const video = await videoModel.findById(videoId);
    if (!video) {
      throw new apiError(401, "video not found");
    }

    return res
      .status(200)
      .json(new apiResponce(200, video, "video details fetched successfully"));
  } catch (error) {
    console.log("error in video.controller.js on videoDeatils controller");
    return res
      .status(400)
      .json(
        new apiError(
          401,
          "error while fetching video details or maybe video is deleted"
        )
      );
  }
});

const updateVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const { title, description } = req.body;
  const thumbnail = req.file?.path;
  if (!videoId) {
    throw new apiError(401, "cant find video id");
  }
  
  const authenticatedId = req.user?._id;
  if (!authenticatedId) {
    throw new apiError(401, "user not found");
  }


  try {

    const video = await videoModel.findOne({
      _id: videoId,
      owner: authenticatedId,
    });

    if (title && title.length > 0) {
      video.title = title;
    }

    if (description && description.length > 0) {
      video.description = description;
    }

    if (thumbnail) {
      const thumbnailUrl = await uploadOnCloudinary(thumbnail);

      if (!thumbnailUrl) {
        throw new apiError(401, "error while uploading on cloudinary");
      }

      video.thumbnail = thumbnailUrl.url;
    }

    await video.save();

    const sendResData = {
      _id: video._id,
      title: video.title,
      description: video.description,
      thumbnail: video.thumbnail,
    };

    return res
      .status(200)
      .json(
        new apiResponce(200, sendResData, "video details updated successfully")
      );
  } catch (error) {
    throw new apiError(
      401,
      "error  updating video's details" + error.message
    );
  }
});

const deleteVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  try {
    if (!videoId) {
      res.status(401).json(new apiError(401, "cant find video id"));
    }

    const deletedVideo = await videoModel.findByIdAndDelete(videoId);

    if (!deletedVideo) {
      throw new apiError(401, "video not found");
    }

    return res
      .status(200)
      .json(new apiResponce(200, "video deleted successfully"));
  } catch (error) {
    console.log("error in video.controller.js on deleteVideo controller");
    throw new apiError(401, "error while deleting video" + error.message);
  }
});

const togglePublishStatus = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!videoId) {
    throw new apiError(401, "cant find video id");
  }

  try {
    const authenticatedId = req.user?._id;

    const video = await videoModel.findByIdAndUpdate(
      {
        _id: videoId,
        owner: authenticatedId,
      },
      {
        $set: {
          isPublished: !video.isPublished,
        },
      }
    );

    const sendResData = {
      _id: video._id,
      isPublished: video.isPublished,
    };

    return res
      .status(200)
      .json(
        new apiResponce(200, sendResData, "video status updated successfully")
      );
  } catch (error) {
    return res.status(400).json(new apiError(400, error.message));
  }
});

export {
  videoUpload,
  updateVideo,
  deleteVideo,
  videoDetails,
  togglePublishStatus,
  getAllVideos,
};

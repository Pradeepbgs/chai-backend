import { apiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import videoModel from "../models/video.model.js";
import { apiResponce } from "../utils/apiResponce.js";
import { cleanUploadedfiles } from "../utils/cleanup.videoFiles.js";

const videoUpload = asyncHandler(async (req, res) => {
    // get the title, description, tags, thumbnail from the request body
    // get the user from req.user
    // check if the user is authenticated 
    // create a new video object with the title, description, tags, thumbnail, user
    // save the video object to the database
    // return the video object
    // res.status

    const user = req.user;
    const { title, description } = req.body
    const videoFile = req.files?.video[0]?.path;
    const thumbnail = req.files?.thumbnail[0]?.path;

    console.log(req.files)

    try {

        if(!user) return res.status(401).json(new apiError(401, "user not found"))
        if(
            [title,description].some((field) => field?.trim() === "")
           ){
                throw new apiError("All field are required", 400)
           }

           if(!videoFile) throw new apiError("video file is required")
           if(!thumbnail) throw new apiError("thumbnail file is required")

           const video = await uploadOnCloudinary(videoFile)
           if(!video){
            // cleanUploadedfiles(req.files)
            throw new apiError("video upload failed")
           }
           const thumbnailUrl = await uploadOnCloudinary(thumbnail)
           if(!thumbnailUrl){
            // cleanUploadedfiles(req.files)
            throw new apiError('thumbnail upload failed')
           }

           const uploadedVideo = await videoModel.create({
            title,
            description,
            videoFile: video.url ?? "",
            thumbnail: thumbnailUrl.url ?? "",
            owner: user._id,
         })

         return res
         .status(201)
         .json(
            new apiResponce(
                201,
                uploadedVideo,
                "video uploaded successfully"
            )
         )

    } catch (error) {
        // cleanUploadedfiles(req.files)
        console.log("error in video.controller.js on videoupload controller"+error)
        return res
        .status(500)
        .json(
            new apiError(401, error.message | "error while uploading video")
        )
    }
    
})

const videoDetails = asyncHandler(async (req, res) => {

    const {videoId} = req.params;

    try {
        if(!videoId){
            throw new apiError(401, "cant find video id")
        }

        const video = await videoModel.findById(videoId)
        if(!video){
            throw new apiError(401, "video not found")
        }

        return res
        .status(200)
        .json(
            new apiResponce(
                200,
                video,
                "video details fetched successfully"
            )
        )

    } catch (error) {
        console.log("error in video.controller.js on videoDeatils controller")
        return res
        .status(400)
        .json(
            new apiError(401, "error while fetching video details or maybe video is deleted")
        )
    }
})

const thumbnailChnage = asyncHandler(async (req,res) => {

    const {videoId} = req.params;
    const thumbnail = req.file?.path;
    try {
        if(!videoId){
            throw new apiError(401, "cant find video id")
        }
        if(!thumbnail){
            throw new apiError('thumbnail required')
        }

        const thumnailUrl = await uploadOnCloudinary(thumbnail)
        if(!thumnailUrl){
            cleanUploadedfiles(req.files)
            
            throw new apiError(401, "error while uploading on cloudinary")
        }

        await videoModel.findByIdAndUpdate(videoId, {
            $set: {
                thumbnail: thumnailUrl.url
            }
        })

        return res
        .status(200)
        .json(
            new apiResponce(
                200,
                thumnailUrl.url,
                "thumbnail updated successfully"
            )
        )

    } catch (error) {
        cleanUploadedfiles(req.files)
        console.log("error in video.controller.js on thumbnailChnage controller")
        throw new apiError(
            401,
            "error while updating video's thumbnail"
        )
    }

})

const videoDetailsChange = asyncHandler(async (req, res) => {

    const {videoId} = req.params;
    const {title, description} = req.body;

    console.log(title, description)
    try {

        if(!videoId){
           throw new apiError(401, "cant find video id")
        }
        if(!title || !description){
            throw new apiError(401, "title and description are required")
        }

       await videoModel.findByIdAndUpdate(videoId, {
            $set: {
                title,
                description
            }
        })

        return res
        .status(200)
        .json(
            new apiResponce(
                200,
                "video details updated successfully",
            )
        )
        
    } catch (error) {
        console.log("error in video.controller.js on videoDetailsChange controller")
        throw new apiError(401, "error while updating video's details" + error.message)
    }

})

const deleteVideo = asyncHandler(async (req, res) => {

    const {videoId} = req.params;

    try {
        if(!videoId){
            res.status(401).json(new apiError(401, "cant find video id"))
        }

        const deletedVideo = await videoModel.findByIdAndDelete(videoId)

        if(!deletedVideo){
          throw new apiError(401, "video not found")
        }

        return res
        .status(200)
        .json(
            new apiResponce(
                200,
                "video deleted successfully",
            )
        )
    } catch (error) {
        console.log("error in video.controller.js on deleteVideo controller")
        throw new apiError(401, "error while deleting video" + error.message)
    }
})

export {
    videoUpload,
    thumbnailChnage,
    videoDetailsChange,
    deleteVideo,
    videoDetails
}
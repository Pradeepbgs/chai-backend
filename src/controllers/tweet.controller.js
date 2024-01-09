import mongoose, { isValidObjectId } from "mongoose";
import Tweet from "../models/tweet.model.js";
import { apiError } from "../utils/apiError.js";
import { apiResponse } from "../utils/apiResponce.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const createTweet = asyncHandler(async (req, res) => {
  const { content } = req.body;

  if (!content || typeof content !== "string") {
    return res.status(400).json(new apiError(400, "Tweet content is required"));
  }

  if (!req.user) {
    return res.status(400).json(new apiError(400, "User is required"));
  }

  const tweet = await Tweet.create({
    content,
    owner: req.user?._id,
  });

  if (!tweet) {
    throw new apiError("Tweet not created");
  }

  return res.status(201).json(new apiResponse(true, tweet, "Tweet created"));
});

const getUserTweets = asyncHandler(async (req, res) => {
  // TODO: get user tweets
  const { userId } = req.params;
  if (!userId) {
    throw new apiError("userID can't find OR invalid user ID");
  }

  const userTweets = await Tweet.aggregate([
    {
      $match: {
        owner: new mongoose.Types.ObjectId(userId),
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "user",
      },
    },
    {
      $project: {
        content: 1,
        createdAt: 1,
        owner: 1,
        username: { $arrayElemAt: ["$user.username", 0] },
        profilePicture: { $arrayElemAt: ["$user.avatar", 0] },
      },
    },
  ]);
  return res
  .status(200)
  .json(new apiResponse(true, userTweets,"user tweets"));
});

const updateTweet = asyncHandler(async (req, res) => {
  //TODO: update tweet
  const { content } = req.body;
  if (!content) {
    throw new apiError("pls write something");
  }
  if (!req.user) {
    throw new apiError("user can't find, pls login");
  }
  const tweet = await Tweet.findOneAndUpdate(
    { owner: req.user?._id },
    { content },
    { new: true }
  );

  if (!tweet) {
    throw new apiError("tweet not found");
  }

  return res.status(200).json(new apiResponse(true, tweet, "tweet updated"));
});

const deleteTweet = asyncHandler(async (req, res) => {
  //TODO: delete tweet
  const { tweetId } = req.params;
  if (!tweetId) {
    throw new apiError("cant find tweet id");
  }
  if (!isValidObjectId(tweetId)) {
    throw new apiError("invalid tweet id");
  }

  const authenticatedId = req.user;
  if (!authenticatedId) {
    throw new apiError("user can't find, pls login");
  }

  const tweet = await Tweet.findOneAndDelete({
    _id: tweetId,
    owner: authenticatedId?._id,
  });

  if (!tweet) {
    throw new apiError("tweet not found");
  }

  return res.status(200).json(new apiResponse(200, "tweet deleted"));
});

export { createTweet, getUserTweets, updateTweet, deleteTweet };

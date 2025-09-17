1.2 Submission process
Table of Contents
Video
Response to marking criteria document
Instructions
Code
Video
This is a short (max 5 minutes) video that demonstrates the functionality of your application.

Be sure to show us that your CPU has been under load for approx. 5 minutes. You could cut the middle of that five minutes to make it shorter or pause the recording while you wait.

Your video must be a screen capture at a high enough quality that the marker can make out details such as text. A recording from your phone is not acceptable.

The purpose of the video is to demonstrate functionality, not explain it. The response to criteria document is used for justifying choices. Keep things brief in the video; you only need to describe what you are demonstrating.

Creating your video:

You can record short videos separately and edit them together
If some operation takes a long time (eg. uploading a video) you can edit it down to save time
OBS StudioLinks to an external site. is a reasonable choice for screen capture, but you can use other software if you like.
Canvas has a built in option for screen capture which you can access through the submission page. Choose the Record media option.
Please demonstrate the following features of your application in this order (to match the marking rubric):

Docker image
Show your Dockerfile and the image repository on ECR on the AWS console
App running on EC2
Show running your app from the ECR repository on an EC2 instance (eg. run the command in a shell)
REST API
Summarise your API endpoints and their functionality
Two kinds of data
Summarise each kind of data:
Structured or unstructured
Its role in the app
How it is stored (eg. in files, using SQLite3, etc.)
CPU intensive task
Summarise what the task is, what data it operates on, how it is implemented
CPU load testing
Demonstrate your method of triggering the CPU intensive task
Show the CPU utilisation on the AWS console or with htop or similar
You don't have to show high CPU utilisation in real-time. You can edit it down to show just the start of the load and after 5 minutes. The CPU utilisation graph on instance details page is useful for showing the sustained load over time.
Some points about the video:

We are not evaluating the video; the video shows us that your app is working. So there is no need for this to be polished.
Some of these points aren't easy to demonstrate (eg. kinds of data). For those you can talk about them and maybe show some relevant code or a quick slide if you like.
When we say "summarise" above, this can be quite short. For example, for the CPU intensive task you might say something like "The CPU intensive task here is video stabilisation. The videos are uploaded by the user. I used ffmpeg for this."
Submit your video to CAB432 A01: Video.

Response to marking criteria document
This document is a kind of table of contents showing the marker how your project satisfies the marking criteria. It is a kind of map that points the marker to the features of your project (functionality, source code, etc.) that fulfil the requirements of the criteria, along with other evidence (such as timestamps for demonstrations in the video.)

Your project may not be assessed if this document is missing. Any criteria not addressed in the document may not be assessed. This document should be very concise. Please follow the template strictly. If the document does not clearly point the marker to relevant features of your project then the marker may not take those features into account during marking.

Template for the file: A1_response_to_criteria.md
Sample for a fictitious project: A1_response_to_criteria_sample.md
Instructions
Review the marking rubric at CAB432 A01: REST API Project
Start with the template. Fill in the details for your application.
Leave the document in markdown format
Keep the structure the same (so it matches with the marking rubric and the video)
Submit this file along with your source code.
Code
Use a logical organisation for your code. Please follow a directory structure similar to this:
- index.js
- Dockerfile
- A1_response_to_criteria.md   <- DON'T FORGET THIS ONE!
- package.json
- package-lock.json
- routes/
    - ...
- data/
    - ...
Please DO NOT include the source code of third-party packages. These will make your submission difficult to work with and therefore, we won't be able to properly mark your response to the assignment.

Your submission should not include .git, __MACOSX or other files that are not required for building and running your application (eg. video files left over from testing)

If you have trouble submitting you code, please ensure that it is no more than 100Mb in size and that you haven't included any extraneous files or directories. (such as those mentioned above.)

Submit via Gradescope at CAB432 A01: Code

This is an individual assignment

Your application must be your own work.
It is OK to copy short snippets of code from unit content, the web, etc. Please include a comment with the source for anything longer than a couple of lines.
It is OK to use ChatGPT and similar generative AI. Please include a comment indicating this where applicable.
Please be aware that Gradescope includes functionality for detecting plagiarism in code.
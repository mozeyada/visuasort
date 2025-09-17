@echo off
echo === Building Docker Image ===
docker build -t visuasort .

echo === Tagging for ECR ===
docker tag visuasort:latest 901444280953.dkr.ecr.us-east-1.amazonaws.com/cab432-students:visuasort

echo === Pushing to ECR ===
docker push 901444280953.dkr.ecr.us-east-1.amazonaws.com/cab432-students:visuasort

echo === Deployment complete! ===
echo Run these commands on your EC2 instance:
echo docker stop visuasort 2^>nul
echo docker rm visuasort 2^>nul
echo docker pull 901444280953.dkr.ecr.us-east-1.amazonaws.com/cab432-students:visuasort
echo docker run -d --name visuasort -p 3000:3000 901444280953.dkr.ecr.us-east-1.amazonaws.com/cab432-students:visuasort
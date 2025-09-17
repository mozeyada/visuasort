# Infrastructure as Code - Visuasort

Complete AWS infrastructure deployment using CloudFormation.

## Single Command Deployment

Deploy entire infrastructure (EC2 + containers) with one command:

```bash
# Make script executable
chmod +x infrastructure/deploy.sh

# Deploy everything
./infrastructure/deploy.sh
```

## What Gets Deployed

1. **EC2 Instance** (t3.micro, Ubuntu 24.04)
2. **Security Group** (SSH + HTTP access)
3. **IAM Role** (ECR read access)
4. **Docker Installation** (automated)
5. **Container Deployment** (from ECR)
6. **Application Startup** (automatic)

## Manual Deployment

```bash
aws cloudformation deploy \
  --template-file infrastructure/cloudformation.yaml \
  --stack-name visuasort-n11693860 \
  --region ap-southeast-2 \
  --capabilities CAPABILITY_IAM \
  --parameter-overrides \
    JWTSecret=supersecret \
    ImaggaAPIKey=your_imagga_api_key \
    ImaggaAPISecret=your_imagga_api_secret \
    HuggingFaceAPIKey=your_huggingface_token_here
```

## Parameters

- `KeyPairName`: EC2 key pair (default: n11693860)
- `JWTSecret`: JWT authentication secret (default: supersecret)
- `ImaggaAPIKey`: Imagga API key (default: your_imagga_api_key)
- `ImaggaAPISecret`: Imagga API secret (default: your_imagga_api_secret)
- `HuggingFaceAPIKey`: Hugging Face API key (default: your_huggingface_token_here)

## Outputs

- **ApplicationURL**: Direct link to running application
- **PublicIP**: EC2 instance public IP
- **SSHCommand**: Ready-to-use SSH command

## Cleanup

```bash
aws cloudformation delete-stack \
  --stack-name visuasort-n11693860 \
  --region ap-southeast-2
```

## Architecture

```
CloudFormation Template
├── EC2 Instance (t3.micro)
│   ├── Ubuntu 24.04 LTS
│   ├── Docker Engine
│   └── Visuasort Container
├── Security Group
│   ├── SSH (port 22)
│   └── HTTP (port 3000)
└── IAM Role
    └── ECR Read Access
```

This achieves **full Infrastructure as Code** compliance:
- ✅ Single command deployment
- ✅ EC2 instance creation
- ✅ Container deployment
- ✅ Complete automation
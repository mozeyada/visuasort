const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

class S3Service {
  constructor() {
    this.s3Client = new S3Client({ region: 'ap-southeast-2' });
    this.bucketName = 'n11693860-visuasort-images';
  }

  async uploadImage(userId, imageId, buffer, format = 'original', extension = 'jpg') {
    const key = `${userId}/${imageId}-${format}.${extension}`;
    
    await this.s3Client.send(new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      Body: buffer,
      ContentType: `image/${extension === 'webp' ? 'webp' : 'jpeg'}`
    }));
    
    return key;
  }

  async getImageBuffer(key) {
    const response = await this.s3Client.send(new GetObjectCommand({
      Bucket: this.bucketName,
      Key: key
    }));
    
    return Buffer.from(await response.Body.transformToByteArray());
  }

  async getPresignedUrl(key, expiresIn = 300) {
    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: key
    });
    
    return await getSignedUrl(this.s3Client, command, { expiresIn });
  }

  async deleteImage(key) {
    await this.s3Client.send(new DeleteObjectCommand({
      Bucket: this.bucketName,
      Key: key
    }));
  }

  async getPresignedUploadUrl(key, contentType = 'image/jpeg', expiresIn = 300) {
    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      ContentType: contentType
    });
    
    return await getSignedUrl(this.s3Client, command, { expiresIn });
  }
}

module.exports = new S3Service();
const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const env = require('../../config/env');

let client;
function getClient() {
  if (!client) {
    client = new S3Client({
      region: env.s3Region || 'us-east-1',
      endpoint: env.s3Endpoint || undefined,
      forcePathStyle: Boolean(env.s3Endpoint), // requis pour MinIO / tout endpoint S3-compatible non-AWS
      credentials:
        env.s3AccessKey && env.s3SecretKey
          ? { accessKeyId: env.s3AccessKey, secretAccessKey: env.s3SecretKey }
          : undefined,
    });
  }
  return client;
}

function contentTypeFromExt(filename) {
  const ext = filename.split('.').pop().toLowerCase();
  const map = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
    mp4: 'video/mp4',
    webm: 'video/webm',
    mov: 'video/quicktime',
    m4v: 'video/x-m4v',
    mp3: 'audio/mpeg',
    ogg: 'audio/ogg',
    wav: 'audio/wav',
    m4a: 'audio/mp4',
    aac: 'audio/aac',
  };
  return map[ext] || 'application/octet-stream';
}

function publicUrl(filename) {
  if (env.s3PublicBaseUrl) {
    return `${env.s3PublicBaseUrl.replace(/\/$/, '')}/${filename}`;
  }
  const base = (env.s3Endpoint || '').replace(/\/$/, '');
  return `${base}/${env.s3Bucket}/${filename}`;
}

async function save(buffer, filename) {
  if (!env.s3Bucket) {
    throw new Error('S3_BUCKET doit être défini quand STORAGE_DRIVER=s3');
  }

  await getClient().send(
    new PutObjectCommand({
      Bucket: env.s3Bucket,
      Key: filename,
      Body: buffer,
      ContentType: contentTypeFromExt(filename),
      ACL: 'public-read',
    })
  );

  return publicUrl(filename);
}

async function remove(url) {
  if (!url) return;
  const filename = url.split('/').pop();
  if (!filename) return;

  await getClient()
    .send(new DeleteObjectCommand({ Bucket: env.s3Bucket, Key: filename }))
    .catch(() => {});
}

module.exports = { save, remove };

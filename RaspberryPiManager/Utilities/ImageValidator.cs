using System.IO;
using System.IO.Compression;
using RaspberryPiManager.Models;

namespace RaspberryPiManager.Utilities;

public interface IImageValidator
{
    Task<bool> ValidateImageAsync(string imagePath);
    Task<OSImageMetadata?> GetImageMetadataAsync(string imagePath);
    Task<bool> IsCompressedImageAsync(string imagePath);
    Task<string> DecompressImageAsync(string compressedPath, string outputPath, IProgress<double>? progress = null);
}

public class ImageValidator : IImageValidator
{
    public async Task<bool> ValidateImageAsync(string imagePath)
    {
        return await Task.Run(() =>
        {
            if (!File.Exists(imagePath))
                return false;

            // Check file extension
            var extension = Path.GetExtension(imagePath).ToLower();
            var validExtensions = new[] { ".img", ".zip", ".xz", ".gz" };
            if (!validExtensions.Contains(extension))
                return false;

            // Check file size (should be > 0)
            var fileInfo = new FileInfo(imagePath);
            if (fileInfo.Length == 0)
                return false;

            // For .img files, check if it's a valid disk image
            if (extension == ".img")
            {
                // Basic validation - check file header
                using var fs = File.OpenRead(imagePath);
                var buffer = new byte[512];
                fs.Read(buffer, 0, 512);

                // Check for common disk image signatures
                // This is simplified - real validation would check partition tables, etc.
                return true;
            }

            return true;
        });
    }

    public async Task<OSImageMetadata?> GetImageMetadataAsync(string imagePath)
    {
        return await Task.Run(() =>
        {
            if (!File.Exists(imagePath))
                return null;

            var fileInfo = new FileInfo(imagePath);
            var extension = Path.GetExtension(imagePath).ToLower();

            return new OSImageMetadata
            {
                ImagePath = imagePath,
                UncompressedSize = fileInfo.Length,
                Format = extension.TrimStart('.'),
                IsCompressed = extension != ".img",
                Properties = new Dictionary<string, object>
                {
                    { "FileSize", fileInfo.Length },
                    { "LastModified", fileInfo.LastWriteTime },
                    { "Extension", extension }
                }
            };
        });
    }

    public async Task<bool> IsCompressedImageAsync(string imagePath)
    {
        var metadata = await GetImageMetadataAsync(imagePath);
        return metadata?.IsCompressed ?? false;
    }

    public async Task<string> DecompressImageAsync(string compressedPath, string outputPath, IProgress<double>? progress = null)
    {
        return await Task.Run(() =>
        {
            var extension = Path.GetExtension(compressedPath).ToLower();

            using var sourceStream = File.OpenRead(compressedPath);
            using var targetStream = File.Create(outputPath);

            Stream decompressionStream;

            switch (extension)
            {
                case ".gz":
                    decompressionStream = new System.IO.Compression.GZipStream(sourceStream, System.IO.Compression.CompressionMode.Decompress);
                    break;
                case ".xz":
                    // XZ decompression would require a library like SharpCompress
                    throw new NotSupportedException("XZ decompression requires additional library");
                case ".zip":
                    // Handle ZIP files
                    using (var archive = System.IO.Compression.ZipFile.OpenRead(compressedPath))
                    {
                        var entry = archive.Entries.FirstOrDefault(e => e.Name.EndsWith(".img"));
                        if (entry != null)
                        {
                            entry.ExtractToFile(outputPath, overwrite: true);
                            return outputPath;
                        }
                    }
                    throw new InvalidOperationException("No .img file found in ZIP archive");
                default:
                    throw new NotSupportedException($"Unsupported compression format: {extension}");
            }

            using (decompressionStream)
            {
                var totalBytes = sourceStream.Length;
                var copiedBytes = 0L;
                var buffer = new byte[8192];
                int bytesRead;

                while ((bytesRead = decompressionStream.Read(buffer, 0, buffer.Length)) > 0)
                {
                    targetStream.Write(buffer, 0, bytesRead);
                    copiedBytes += bytesRead;

                    if (progress != null && totalBytes > 0)
                    {
                        var percent = (double)copiedBytes / totalBytes * 100;
                        progress.Report(percent);
                    }
                }
            }

            return outputPath;
        });
    }
}

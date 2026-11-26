<?php

namespace App\Services;

/**
 * Lightweight pure-PHP ZIP builder using built-in zlib (no ext-zip dependency).
 */
class SimpleZipBuilder
{
    /** @var array<int, array{name: string, crc: int, compressed: string, compressed_size: int, uncompressed_size: int, offset: int}> */
    private array $entries = [];

    private string $buffer = '';

    public function addFromString(string $filename, string $content): void
    {
        $filename = ltrim(str_replace('\\', '/', $filename), '/');
        $uncompressedSize = strlen($content);
        $crc = crc32($content);
        $compressed = gzdeflate($content, 6);
        $compressedSize = strlen($compressed);
        $offset = strlen($this->buffer);

        // Local file header (30 bytes + filename length)
        $localHeader = pack(
            'VvvvvvVVVvv',
            0x04034B50, // Local file header signature
            20,         // Version needed to extract (2.0)
            0x0800,     // UTF-8 filename flag
            8,          // Compression method: deflate
            0,          // Last mod file time
            0x5421,     // Last mod file date
            $crc,
            $compressedSize,
            $uncompressedSize,
            strlen($filename),
            0           // Extra field length
        );

        $this->buffer .= $localHeader.$filename.$compressed;

        $this->entries[] = [
            'name' => $filename,
            'crc' => $crc,
            'compressed' => $compressed,
            'compressed_size' => $compressedSize,
            'uncompressed_size' => $uncompressedSize,
            'offset' => $offset,
        ];
    }

    public function finish(): string
    {
        $centralDirOffset = strlen($this->buffer);
        $centralDir = '';

        foreach ($this->entries as $entry) {
            $centralDir .= pack(
                'VvvvvvvVVVvvvvvVV',
                0x02014B50, // Central file header signature
                20,         // Version made by
                20,         // Version needed to extract
                0x0800,     // UTF-8 filename flag
                8,          // Compression method: deflate
                0,          // Last mod file time
                0x5421,     // Last mod file date
                $entry['crc'],
                $entry['compressed_size'],
                $entry['uncompressed_size'],
                strlen($entry['name']),
                0,          // Extra field length
                0,          // File comment length
                0,          // Disk number start
                0,          // Internal file attributes
                0,          // External file attributes
                $entry['offset']
            ).$entry['name'];
        }

        $centralDirSize = strlen($centralDir);
        $count = count($this->entries);

        $eocd = pack(
            'VvvvvVVv',
            0x06054B50, // End of central dir signature
            0,          // Number of this disk
            0,          // Disk where central directory starts
            $count,     // Number of central directory records on this disk
            $count,     // Total number of central directory records
            $centralDirSize,
            $centralDirOffset,
            0           // Comment length
        );

        return $this->buffer.$centralDir.$eocd;
    }
}

/**
 * GIF Parser - Simple but functional GIF frame extractor
 */
class GifParser {
    constructor(arrayBuffer) {
        this.buffer = new Uint8Array(arrayBuffer);
        this.pos = 0;
        this.frames = [];
        this.width = 0;
        this.height = 0;
        this.globalColorTable = null;
        this._parse();
    }

    _readByte() {
        return this.buffer[this.pos++];
    }

    _readBytes(n) {
        const bytes = this.buffer.slice(this.pos, this.pos + n);
        this.pos += n;
        return bytes;
    }

    _readWord() {
        const lo = this._readByte();
        const hi = this._readByte();
        return lo | (hi << 8);
    }

    _parse() {
        const signature = String.fromCharCode(this._readByte(), this._readByte(), this._readByte());
        if (signature !== 'GIF') throw new Error('Invalid GIF signature');

        const version = String.fromCharCode(this._readByte(), this._readByte(), this._readByte());
        if (version !== '87a' && version !== '89a') throw new Error('Unsupported GIF version');

        this.width = this._readWord();
        this.height = this._readWord();
        const packed = this._readByte();
        const globalColorTableFlag = (packed & 0x80) >> 7;
        const globalColorTableSize = 1 << ((packed & 0x07) + 1);
        this._readByte(); // bgColorIndex
        this._readByte(); // pixelAspectRatio

        if (globalColorTableFlag) {
            this.globalColorTable = this._readBytes(globalColorTableSize * 3);
        }

        while (this.pos < this.buffer.length) {
            const separator = this._readByte();
            if (separator === 0x21) this._parseExtension();
            else if (separator === 0x2C) this._parseImage();
            else if (separator === 0x3B) break;
            else if (separator === 0x00) continue;
        }
    }

    _parseExtension() {
        const label = this._readByte();
        if (label === 0xF9) this._parseGraphicControlExtension();
        else this._skipDataSubBlocks();
    }

    _parseGraphicControlExtension() {
        this._readByte(); // blockSize
        const packed = this._readByte();
        const disposalMethod = (packed & 0x1C) >> 2;
        const transparentColorFlag = packed & 0x01;
        const delayTime = this._readWord();
        const transparentColorIndex = this._readByte();
        this._readByte(); // blockTerminator

        if (this.frames.length === 0) {
            this.currentFrameData = {
                delay: Math.max(delayTime * 10, 50),
                disposalMethod: disposalMethod,
                transparentColorFlag: transparentColorFlag,
                transparentColorIndex: transparentColorIndex
            };
        } else {
            if (!this.frames[this.frames.length - 1].delay) {
                this.frames[this.frames.length - 1].delay = Math.max(delayTime * 10, 50);
            }
        }
    }

    _parseImage() {
        const left = this._readWord();
        const top = this._readWord();
        const width = this._readWord();
        const height = this._readWord();
        const packed = this._readByte();
        const localColorTableFlag = (packed & 0x80) >> 7;
        const interlaceFlag = (packed & 0x40) >> 6;
        const localColorTableSize = localColorTableFlag ? 1 << ((packed & 0x07) + 1) : 0;

        let colorTable = this.globalColorTable;
        if (localColorTableFlag) {
            colorTable = this._readBytes(localColorTableSize * 3);
        }

        const lzwMinimumCodeSize = this._readByte();
        this._skipDataSubBlocks(); // Skip image data in this simple parser

        this.frames.push({
            left, top, width, height,
            localColorTableFlag, interlaceFlag,
            colorTable, lzwMinimumCodeSize,
            delay: (this.currentFrameData && this.currentFrameData.delay) || 100
        });

        this.currentFrameData = null;
    }

    _skipDataSubBlocks() {
        let blockSize = this._readByte();
        while (blockSize > 0) {
            this.pos += blockSize;
            blockSize = this._readByte();
        }
    }

    getFrames() { return this.frames; }
    numFrames() { return this.frames.length; }
}

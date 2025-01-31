"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.downloadImagesFromString = void 0;
var fs = require("fs");
var path = require("path");
var https = require("https");
var baseUrl = 'https://kickbase.b-cdn.net/pool/playersbig/';
var outputDir = path.join(process.cwd(), 'public', 'player-images');
// Ensure the output directory exists
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}
// Function to download an image for a single player
function downloadPlayerImage(playerId) {
    var url = "".concat(baseUrl).concat(playerId, ".png");
    var filePath = path.join(outputDir, "".concat(playerId, ".png"));
    return new Promise(function (resolve) {
        https.get(url, function (response) {
            if (response.statusCode === 200) {
                var file_1 = fs.createWriteStream(filePath);
                response.pipe(file_1);
                file_1.on('finish', function () {
                    file_1.close();
                    console.log("Downloaded: ".concat(playerId, ".png"));
                    resolve("/player-images/".concat(playerId, ".png"));
                });
            }
            else {
                console.log("Failed to download: ".concat(playerId, ".png"));
                resolve(null);
            }
        }).on('error', function (err) {
            console.error("Error downloading ".concat(playerId, ".png:"), err.message);
            resolve(null);
        });
    });
}
// Function to download images for an array of player IDs
function downloadPlayerImages(playerIds) {
    return __awaiter(this, void 0, void 0, function () {
        var results, _i, playerIds_1, playerId, _a, _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    results = {};
                    _i = 0, playerIds_1 = playerIds;
                    _c.label = 1;
                case 1:
                    if (!(_i < playerIds_1.length)) return [3 /*break*/, 4];
                    playerId = playerIds_1[_i];
                    _a = results;
                    _b = playerId;
                    return [4 /*yield*/, downloadPlayerImage(playerId)];
                case 2:
                    _a[_b] = _c.sent();
                    _c.label = 3;
                case 3:
                    _i++;
                    return [3 /*break*/, 1];
                case 4:
                    console.log('All downloads completed');
                    return [2 /*return*/, results];
            }
        });
    });
}
// New function to download images based on a comma-separated string of player IDs
function downloadImagesFromString(playerIdsString) {
    return __awaiter(this, void 0, void 0, function () {
        var playerIds, imageUrls;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    playerIds = playerIdsString.split(',').map(function (id) { return id.trim(); });
                    return [4 /*yield*/, downloadPlayerImages(playerIds)];
                case 1:
                    imageUrls = _a.sent();
                    console.log('Downloaded image URLs:', imageUrls);
                    return [2 /*return*/, imageUrls];
            }
        });
    });
}
exports.downloadImagesFromString = downloadImagesFromString;
// Main function to run the script
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var args, playerIdsString, outputPath;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    args = process.argv.slice(2);
                    if (args.length === 0) {
                        console.error('Please provide a comma-separated string of player IDs as an argument.');
                        process.exit(1);
                    }
                    playerIdsString = args[0];
                    return [4 /*yield*/, downloadImagesFromString(playerIdsString)];
                case 1:
                    _a.sent();
                    outputPath = path.join(outputDir, 'players.json');
                    fs.readdir(outputDir, function (err, files) {
                        if (err) {
                            return console.error('Unable to scan directory:', err);
                        }
                        var playerIds = files
                            .filter(function (file) { return file.endsWith('.png'); })
                            .map(function (file) { return file.replace('.png', ''); });
                        fs.writeFile(outputPath, JSON.stringify(playerIds, null, 2), function (err) {
                            if (err) {
                                return console.error('Error writing JSON file:', err);
                            }
                            console.log('Player IDs JSON file has been saved.');
                        });
                    });
                    return [2 /*return*/];
            }
        });
    });
}
// Run the main function if this script is executed directly
if (require.main === module) {
    main();
}

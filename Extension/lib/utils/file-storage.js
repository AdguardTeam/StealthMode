/**
 * This file is part of Adguard Browser Extension (https://github.com/AdguardTeam/AdguardBrowserExtension).
 *
 * Adguard Browser Extension is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Lesser General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * Adguard Browser Extension is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with Adguard Browser Extension.  If not, see <http://www.gnu.org/licenses/>.
 */

/* global FileError, BlobBuilder, WebKitBlobBuilder /*

 */
/**
 * File storage adapter
 */
var FS = (function () {

    'use strict';

    return {

        LINE_BREAK: '\n',

        readFromFile: function (path, callback) {

            var successCallback = function (fs, fileEntry) {

                fileEntry.file(function (file) {

                    var reader = new FileReader();
                    reader.onloadend = function () {

                        if (reader.error) {
                            callback(reader.error);
                        } else {
                            var lines = [];
                            if (reader.result) {
                                lines = reader.result.split(/[\r\n]+/);
                            }
                            callback(null, lines);
                        }
                    };

                    reader.onerror = function (e) {
                        callback(e);
                    };

                    reader.readAsText(file);

                }, callback);
            };

            this._getFile(path, true, successCallback, callback);
        },

        writeToFile: function (path, data, callback) {

            var successCallback = function (fs, fileEntry) {

                fileEntry.createWriter(function (fileWriter) {

                    var writeOperation = function (operation, nextOperation) {

                        fileWriter.onwriteend = function () {
                            if (fileWriter.error) {
                                callback(fileWriter.error);
                            } else {
                                nextOperation();
                            }
                        };

                        fileWriter.onerror = function (e) {
                            callback(e);
                        };

                        operation();
                    };

                    var nextOperation = function () {
                        var blob;
                        try {
                            blob = new Blob([data.join(FS.LINE_BREAK)], {type: "text/plain"});
                        } catch (ex) {
                            var BlobBuilderClass = (window.BlobBuilder || window.WebKitBlobBuilder);
                            var builder = new BlobBuilderClass();
                            builder.append(data.join(FS.LINE_BREAK));
                            blob = builder.getBlob("text/plain");
                        }

                        writeOperation(fileWriter.write.bind(fileWriter, blob), callback);
                    };

                    writeOperation(fileWriter.truncate.bind(fileWriter, 0), nextOperation);

                }, callback);
            };

            this._getFile(path, true, successCallback, callback);
        },

        _getFile: function (path, create, successCallback, errorCallback) {

            path = path.replace(/^.*[\/\\]/, "");

            var requestFileSystem = window.requestFileSystem || window.webkitRequestFileSystem;
            requestFileSystem(window.PERSISTENT, 1024 * 1024 * 1024, function (fs) {
                fs.root.getFile(path, {create: create}, function (fileEntry) {
                    successCallback(fs, fileEntry);
                }, errorCallback);
            }, errorCallback);
        },

        translateError: function (e) {
            var msg = e.message || e.name;
            if (msg) {
                return msg;
            }
            switch (e.code) {
                case FileError.QUOTA_EXCEEDED_ERR:
                    msg = 'QUOTA_EXCEEDED_ERR';
                    break;
                case FileError.NOT_FOUND_ERR:
                    msg = 'NOT_FOUND_ERR';
                    break;
                case FileError.SECURITY_ERR:
                    msg = 'SECURITY_ERR';
                    break;
                case FileError.INVALID_MODIFICATION_ERR:
                    msg = 'INVALID_MODIFICATION_ERR';
                    break;
                case FileError.INVALID_STATE_ERR:
                    msg = 'INVALID_STATE_ERR';
                    break;
                default:
                    msg = 'Unknown Error';
                    break;
            }
            return msg;
        }
    };

})();
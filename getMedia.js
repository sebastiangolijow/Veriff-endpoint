let publicKeyTest = 'd37417c1-f68c-4664-815d-349cbbee262c';
let publicKeyLiveUAT = 'c9eb22f4-6727-499e-86aa-f2553e0c2d89'
let publicKeyLiveProd = 'cb24831f-c738-40a4-9101-35c4315ec574';
let privateKeyTest = 'f783286e-3ecb-4372-a455-39a98c69f9f1';
let privateKeyLiveUAT = '5fed2c69-8e64-4963-8c10-86e76b603dd3';
let privateKeyLiveProd = '30ef8b06-cf27-4e49-ae3f-9dd9e136ed98';
let installerFolder = '1PSatAXl3hOdnFyHEv0qkD7Ju57Te21wr';
let loanFolder = '1pmvGhudb9ohHakmNgL67UF6AYcxQ_7uR';
const loanUATFolder = '1O66qQrlXifRWbYDifWFHnZAeUxTHbLvH';
const installerUATFolder = '1rJThPkTKZPMAzayV3VAMbLMdDC2JrX2q';

function doGet(e) {

  if(e.parameter.name === 'getMedia') {
    let response = returnMedia(e.parameter.sessionID, e.parameter.folderName, e.parameter.userType, e.parameter.id, e.parameter.key);
    return ContentService.createTextOutput(response);
  }
  return ContentService.createTextOutput('Fail');

}

function returnMedia(sessionID, folderName, userType, id, key) {

// let sessionIDUAT = '3f898a39-43d2-43c3-bcd5-b7b4f8989fcb';
// let sessionIDLive = '4eff4642-3203-4da5-9907-4db4a0166451'
// let folderName = 'test';
// let userType = 'installer';
// let id = '1637532897071x127235117463299520';
// let key = 'liveProd';
  let response = JSON.parse(getMedia(sessionID, key));
  if(response.status === 'fail') return 'Error: choose correct key';
  let videoID = response.videos[0].id;
  let videoName = response.videos[0].name;
  let videoMimeType = response.videos[0].mimetype;
  let videoSessionID = response.videos[0].sessionId;
  let video = {id: videoID, name: videoName, type: videoMimeType, videoSessionID};
  var responseVideo = getImage(video, folderName, userType, id, key);
  for(var i = 0; i < response.images.length; i++) {
    let image = {id: response.images[i].id, name: response.images[i].name, type: response.images[i].mimetype};
    getImage(image, folderName, userType, id, key);
  }
return responseVideo;

}

function getMedia(sessionID, key) {
let privateKey = privateKeyLiveProd;
if(key === 'liveUAT')  privateKey = privateKeyLiveUAT;
else if(key === 'test')  privateKey = privateKeyTest;
let publicKey = publicKeyLiveProd;
if(key === 'liveUAT')  publicKey = publicKeyLiveUAT;
else if(key === 'test')  publicKey = publicKeyTest;
var signature = Utilities.computeHmacSha256Signature(sessionID, privateKey);

    var response = UrlFetchApp.fetch(
      `https://stationapi.veriff.com/v1/sessions/${sessionID}/media` , 
      {
        'method' : 'get',
        'muteHttpExceptions': true,
        'headers':  { 
          'Content-Type': 'application/json',
          'X-HMAC-SIGNATURE': signature.map(function(chr){return (chr+256).toString(16).slice(-2)}).join(''),
          'X-AUTH-CLIENT': publicKey,
        },
      }
    );
  return response;

}

function getImage(image, folderName, userType, id, key) {
  let folder = '';
  if (userType === 'installer' && key === 'liveUAT') folder = installerUATFolder;
  if (userType === 'customer' && key === 'liveUAT') folder = loanUATFolder;
  if (userType === 'customer' && key === 'liveProd') folder = loanFolder;
  if(userType === 'installer' && key === 'liveProd') folder = installerFolder;
  var responseImage = getData(image.id, image.type, key);
  var workFolder = getOrCreateFolder(folder, folderName, id, userType);
  var returnFolder = manageMediaFolder(workFolder, responseImage, image.name);
  return returnFolder.getUrl();

}

function getData(mediaID, type, key) {

let privateKey = privateKeyLiveProd;
if(key === 'liveUAT') privateKey = privateKeyLiveUAT;
else if(key === 'test') privateKey = privateKeyTest;
let publicKey = publicKeyLiveProd;
if(key === 'liveUAT') publicKey = publicKeyLiveUAT;
else if(key === 'test') publicKey = publicKeyTest;
var signature = Utilities.computeHmacSha256Signature(mediaID, privateKey);
 let response =  UrlFetchApp.fetch(
      `https://stationapi.veriff.com/v1/media/${mediaID}` , 
      {
        'method' : 'get',
        'muteHttpExceptions': true,
        'headers':  {
          'Content-Type': type,
          'X-HMAC-SIGNATURE': signature.map(function(chr){return (chr+256).toString(16).slice(-2)}).join(''),
          'X-AUTH-CLIENT': publicKey,
        },
      }
    );
  return response;

}

function manageMediaFolder(workFolder, response, imageName) {

  let flag = false;
  let folderIterator = workFolder.getFoldersByName('media files');
  while(folderIterator.hasNext() && flag === false) {
    flag = true;
    var tempFolder = folderIterator.next();
    let files = tempFolder.getFilesByName(imageName);
    if (files.hasNext()) return workFolder;
    let blob = response.getBlob();
    blob.setName(imageName);
    tempFolder.createFile(blob);
  }
  if(!folderIterator.hasNext() && flag === false) {
    flag = true;
    var mediaFolder = workFolder.createFolder('media files');
    let blob = response.getBlob();
    blob.setName(imageName)
    mediaFolder.createFile(blob).getUrl();
  }
  return workFolder;

}

function getOrCreateFolder(rootFolderId, folderName) {

  let rootFolder = DriveApp.getFolderById(rootFolderId);
  let folderIterator = rootFolder.getFolders();
  let flag = false;
  while(folderIterator.hasNext()) {
    let tempFolder = folderIterator.next();
     if(tempFolder.getName().includes(folderName)) {
        flag = true;
        return  tempFolder;
   } 
  }
  if(!folderIterator.hasNext() && flag === false) {
    let userFolder = rootFolder.createFolder(folderName);
    return userFolder;
    
  }
}

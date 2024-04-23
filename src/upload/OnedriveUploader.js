import IUploader from './IUploader'
import UploadException from './exception/UploadException'

class OnedriveUploader extends IUploader{

    static async upload(file,config=false,progressCallback=false) {
        debugger;
        console.log("upload",file);
        let url = config.url;
        let pass = config.password;
        let time = parseInt(Date.now() / 1000) + 60 * 60;
        let path = config.path ? config.path : "/share";
        if(!config.isSplit){
            path += "/"+new Date().getFullYear()
        }

        const toStringBody = (body) => {
            let stringBody = "";
            for (let key in body) {
                stringBody += key + "=" + body[key] + "&";
            }
            return encodeURI(stringBody.substr(0, stringBody.length - 1));
        };

        var md5 = require("md5");
        let cookie = md5("admin:" + md5(pass) + "@" + time) + "(" + time + ")";

        let filearray = await file.arrayBuffer();
        let filesize = filearray.byteLength;
        let filemd5 = md5(filearray);
        let body = {
            upbigfilename: file.name,
            filesize: filesize,
            filelastModified: Date.now(),
            filemd5: filemd5,
        };
        const resp = await window.utils.request({
            url: url + path + "/?action=upbigfile",
            method: "POST",
            body: toStringBody(body),
            headers: {
                "x-requested-with": "XMLHttpRequest",
                "Cookie": "secure=false;SameSite=None;Security=true;admin=" + cookie+";",
                "Content-Type": "text/plain;charset=UTF-8",
                "User-Agent": "PicGo",
            },
            
        
        });
        // console.log(berforUpload);

        // if (!berforUpload.ok) {
        //     throw new UploadException(`上传失败 ${berforUpload.status}`);
        // }

        // const resp = await berforUpload.json();

        console.log(resp);

        resp.imgName = body.upbigfilename;
        resp.imgUrl = url +path+"/" + body.upbigfilename;

        let asize = 0;
        let bsize = filesize - 1;
        let customHeader = {
            "content-length": filesize,
            "Content-Range":
                "bytes " + asize + "-" + bsize + "/" + filesize,
                "Content-Type": "text/plain;charset=UTF-8",
            "User-Agent": "PicGo",
        };

        const upload = await fetch(resp.uploadUrl, {
            method: "PUT",
            body: filearray,
            headers: customHeader,
            credentials: 'include'
        });

        if (!upload.ok) {
            throw new UploadException(`上传失败 ${upload.status}`);
        }
        console.log(upload);

        
        return {
            url: resp.imgUrl,
            expire: null
        };
    }


    static name(){
        return "onedrive";
    }

    static order(){ return 80;}

    static config(){
        return [
            {label: "onedriveUrl", name: "url", type: "text", required: true},
            {label: "密码", name: "password", type: "text", required: true},
            {label: "上传路径", name: "path", type: "text",desc: "为空 默认新建目录 /share"},
            {label: "按年分割", name: "isSplit", type: "text",desc: "0：是 1：否 默认按年分割"},
        ];
    }
}

export default OnedriveUploader;

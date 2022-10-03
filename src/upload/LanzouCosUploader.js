import IUploader from "@/upload/IUploader";
import UploadException from "@/upload/exception/UploadException";

export default class LanzouCosUploader extends IUploader{

    static async upload(file,config=false,progressCallback=false) {
        // 验证有木有设置Cookie
        if (!config.cookie){
            throw new UploadException('请先在设置里面登录蓝奏云');
        }

        // https://pc.woozooo.com/fileup.php
        let headers = {
            'Cookie': config.cookie
        }

        console.log(headers,file);

        let buffer = Buffer.from(await file.arrayBuffer());

        const formData = {
            task: '1',
            ve: '2',
            id: 'WU_FILE_0',
            name: file.name,
            type: file.type,
            size: file.size,
            upload_file: {
                value: buffer,
                options: {
                    filename: file.name,
                    contentType: file.type
                }
            }
        }
        if (config.folder){
            formData['folder_id_bb_n'] = config.folder;
        }

        let result = await window.utils.requestFormData({
            url: 'http://pc.woozooo.com/fileup.php',
            method: "post",
            headers: headers,
            onUploadProgress: function (progressEvent) { //原生获取上传进度的事件
                progressCallback(progressEvent.loaded / progressEvent.total);
            }
        },formData);

        console.log("fileup",result);

        if (result.text === 'error'){
            throw new UploadException(result.info);
        }

        let id = result.text[0].id;

        let shareResult = await this.share(id,headers);

        if (config.remark){
            await this.remark(id,config.remark,headers);
        }

        return {
            url: shareResult.info.is_newd + '/' + shareResult.info.f_id,
            expire: null
        };
    }

    static async share(id,headers){
        let shareResult = await window.utils.request({
            url: "http://pc.woozooo.com/doupload.php",
            method: "post",
            form: {
                task: 22,
                file_id: id
            },
            headers: headers
        })

        return shareResult;
    }

    static async remark(id,desc,headers){
        return await window.utils.request({
            url: "http://pc.woozooo.com/doupload.php",
            method: "post",
            form: {
                task: 11,
                file_id: id,
                desc: desc
            },
            headers: headers
        })
    }

    static async folders(cookie){
        let result =  await window.utils.request({
            url: "http://pc.woozooo.com/doupload.php",
            method: "post",
            form: {
                task: 47,
                folder_id: -1,
            },
            headers: {
                'Cookie': cookie
            }
        })
        console.log('folders',result);

        let folders = [
            {label: "根目录", value: 0}
        ];
        for (const folder of result.text) {
            folders.push({
                label: folder.name,
                value: folder.fol_id
            })
        }
        return folders;
    }

    static name(){
        return "蓝奏云";
    }

    static async login(url){
        var result = await utools.ubrowser.goto(url)
            // .devTools('detach')
            .wait(() => {
                console.log(document.cookie,document.cookie.includes("phpdisk_info"));
                return document.cookie.includes("phpdisk_info")
            })
            .evaluate(() => document.cookie)
            .run({ width: 1000, height: 600 })

        let cookie;

        if (result.length > 0) {

            cookie = result[0];

            utools.showNotification('蓝奏云登陆成功')
        }

        console.log('登陆成功',cookie);

        return cookie;
    }

    static async init(uploader){
        await this.initFolders(uploader);
    }

    static async initFolders(uploader){
        console.log('initFolders',uploader);
        if (!uploader.config.cookie){
            return;
        }

        let folders = await this.folders(uploader.config.cookie);

        console.log('initFolders get',folders);

        if (!folders){
            folders = [
                {label: "根目录", value: 0}
            ]
        }

        for (const item of uploader.configParameters) {
            if (item.name === 'folder'){
                item.options = folders;
                break;
            }
        }
    }

    static order(){
        return 20;
    }

    static config(){
        return [
            {label: "登录", name: "login", type: "button",handle: async (event,uploader) =>{
                    uploader.config.cookie = await this.login(uploader.config.host);

                    // 重新初始化下
                    await uploader.instance.initFolders(uploader);
            }},
            {label: "登录后的cookie", name: "cookie", type: "text"},
            {label: "蓝奏云地址", name: "host", type: "text",value: 'https://pc.woozooo.com/'},
            {label: "上传目录(可选)", name: "folder", type: "select",options: [
                {label: "请登录后获取", value: 0}
            ],value: 0},
            {label: "上传备注(可选)", name: "remark", type: "text",value: '来自UTOOLS上传'},
        ];
    }
}

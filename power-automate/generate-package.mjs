/**
 * Generates an importable Power Automate package for PHVB Ban hành.
 * Run: node power-automate/generate-package.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FLOW_ID = 'c2c4360a-b4e1-4f7a-9c11-08587b410001';
const DISPLAY_NAME = 'PHVB Ban hành HTTP 202';

const RELEASE_SELECT = [
  'Id', 'Title', 'Tenvanban', 'NgayPhatHanh', 'HieuLucTu', 'HieuLucDen',
  'NoiLuuBanCung', 'TomTatNoiDung', 'NguoiTao', 'EmailNguoiTao', 'KhoaPhongNguoiTao',
  'IdYeuCau', 'PheDuyet', 'LienHe', 'StatusApproved', 'LoaiYeuCau', 'Created',
  'ThamDinh', 'NguoiGopY', 'SoVanBan', 'TenVanBan_ENG', 'DC_CapSo_Name',
  'DC_CapSo_Email', 'Loai_SLA', 'Date_GopY', 'Date_ThamDinh', 'Date_PheDuyet',
  'ThuMucBanHanh', 'IDFolderOld', 'IdVanBanChinh', 'GhiChuChoThamDinh',
  'IsSendMailNotify', 'EmailNhanBanHanh', 'SubjectBanHanh', 'BodyEmail'
].join(',');

function spHttp(name, method, uri, runAfter, options = {}) {
  const parameters = {
    dataset: "@triggerBody()?['siteUrl']",
    'parameters/method': method,
    'parameters/uri': uri,
    'parameters/headers': {
      Accept: 'application/json;odata=nometadata',
      'Content-Type': 'application/json;odata=nometadata',
      ...(options.headers || {})
    }
  };
  if (options.body !== undefined) {
    parameters['parameters/body'] = options.body;
  }
  const action = {
    type: 'OpenApiConnection',
    inputs: {
      host: {
        connectionName: 'shared_sharepointonline',
        operationId: 'HttpRequest',
        apiId: '/providers/Microsoft.PowerApps/apis/shared_sharepointonline'
      },
      parameters,
      authentication: "@parameters('$authentication')"
    },
    runAfter: runAfter || {}
  };
  if (options.operationOptions) {
    action.operationOptions = options.operationOptions;
  }
  return { [name]: action };
}

function compose(name, inputs, runAfter) {
  return {
    [name]: {
      type: 'Compose',
      inputs,
      runAfter: runAfter || {}
    }
  };
}

function terminate(name, runStatus, runAfter, message) {
  const inputs = { runStatus };
  if (message) {
    inputs.runError = {
      code: name,
      message
    };
  }
  return {
    [name]: {
      type: 'Terminate',
      inputs,
      runAfter: runAfter || {}
    }
  };
}

function iff(name, expression, runAfter, ifTrue, ifFalse) {
  return {
    [name]: {
      type: 'If',
      expression,
      actions: ifTrue || {},
      else: { actions: ifFalse || {} },
      runAfter: runAfter || {}
    }
  };
}

function scope(name, actions, runAfter) {
  return {
    [name]: {
      type: 'Scope',
      actions,
      runAfter: runAfter || {}
    }
  };
}

function foreach(name, foreachExpr, actions, runAfter, concurrency) {
  const action = {
    type: 'Foreach',
    foreach: foreachExpr,
    actions,
    runAfter: runAfter || {}
  };
  if (concurrency) {
    action.runtimeConfiguration = { concurrency: { repetitions: concurrency } };
  }
  return { [name]: action };
}

function query(name, from, where, runAfter) {
  return {
    [name]: {
      type: 'Query',
      inputs: { from, where },
      runAfter: runAfter || {}
    }
  };
}

function http(name, uri, body, headers, runAfter) {
  return {
    [name]: {
      type: 'Http',
      inputs: {
        method: 'POST',
        uri,
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          ...(headers || {})
        },
        body
      },
      runAfter: runAfter || {}
    }
  };
}

function merge(...parts) {
  return Object.assign({}, ...parts);
}

function sanitizeFolderExpr(valueExpr) {
  const chars = ['"', '*', ':', '<', '>', '?', '/', '\\', '|', '#', '%'];
  let expr = `trim(${valueExpr})`;
  for (const ch of chars) {
    const needle = ch === '\\' ? '\\\\' : ch;
    expr = `replace(${expr}, '${needle}', '')`;
  }
  return `trim(replace(replace(${expr}, '  ', ' '), '  ', ' '))`;
}

const missingRequiredExpr = `@or(empty(trim(string(triggerBody()?['siteUrl']))),empty(string(triggerBody()?['itemId'])),empty(trim(string(triggerBody()?['endPointSendMail']))),empty(trim(string(triggerBody()?['endPointShortUrl']))),empty(trim(string(triggerBody()?['webPartPageUrl']))),empty(trim(string(triggerBody()?['roleGroupID']))),empty(trim(string(triggerBody()?['nguoiThucHien']))))`;

const isFullIssuanceExpr = `@or(equals(trim(string(body('Get_Release_Item')?['LoaiYeuCau'])), 'Tạo mới'),equals(trim(string(body('Get_Release_Item')?['LoaiYeuCau'])), 'Điều chỉnh'))`;

const odataFolder = (pathExpr) =>
  `@concat('_api/web/GetFolderByServerRelativeUrl(@folderPath)?@folderPath=''',encodeUriComponent(${pathExpr}),'''')`;

const odataAddFolder = (parentExpr, nameExpr) =>
  `@concat('_api/web/GetFolderByServerRelativeUrl(@parentPath)/folders/add(@folderName)?@parentPath=''',encodeUriComponent(${parentExpr}),'''&@folderName=''',encodeUriComponent(${nameExpr}),'''')`;

const odataCopy = (sourceExpr, targetExpr) =>
  `@concat('_api/web/GetFileByServerRelativeUrl(@fileUrl)/copyTo(strnewurl=@newUrl,boverwrite=true)?@fileUrl=''',encodeUriComponent(${sourceExpr}),'''&@newUrl=''',encodeUriComponent(${targetExpr}),'''')`;

const odataMoveFile = (sourceExpr, targetExpr) =>
  `@concat('_api/web/GetFileByServerRelativeUrl(@fileUrl)/moveto(newurl=@newUrl,flags=1)?@fileUrl=''',encodeUriComponent(${sourceExpr}),'''&@newUrl=''',encodeUriComponent(${targetExpr}),'''')`;

const odataMoveFolder = (sourceExpr, targetExpr) =>
  `@concat('_api/web/GetFolderByServerRelativeUrl(@folderUrl)/moveto(newUrl=@newUrl)?@folderUrl=''',encodeUriComponent(${sourceExpr}),'''&@newUrl=''',encodeUriComponent(${targetExpr}),'''')`;

const ensureFolderActions = merge(
  compose(
    'Compose_Next_Folder_Path',
    `@concat(variables('issuanceCurrentPath'), '/', items('Ensure_Target_Folder_Segments'))`,
    {}
  ),
  spHttp(
    'Get_Folder_Segment',
    'GET',
    odataFolder("outputs('Compose_Next_Folder_Path')"),
    { Compose_Next_Folder_Path: ['Succeeded'] }
  ),
  spHttp(
    'Create_Folder_Segment',
    'POST',
    odataAddFolder("variables('issuanceCurrentPath')", "items('Ensure_Target_Folder_Segments')"),
    { Get_Folder_Segment: ['Failed', 'TimedOut'] }
  ),
  {
    Set_issuanceCurrentPath: {
      type: 'SetVariable',
      inputs: {
        name: 'issuanceCurrentPath',
        value: "@outputs('Compose_Next_Folder_Path')"
      },
      runAfter: {
        Get_Folder_Segment: ['Succeeded', 'Failed', 'TimedOut', 'Skipped'],
        Create_Folder_Segment: ['Succeeded', 'Failed', 'TimedOut', 'Skipped']
      }
    }
  }
);

const copyOneFile = (foreachName, isForm) => merge(
  compose(
    `Compose_Target_File_Path_${foreachName}`,
    isForm
      ? `@concat(variables('issuanceCurrentPath'), '/', items('${foreachName}')?['FileLeafRef'])`
      : `@concat(variables('issuanceCurrentPath'), substring(items('${foreachName}')?['FileRef'], length(outputs('Compose_Source_Folder'))))`,
    {}
  ),
  spHttp(
    `Copy_File_${foreachName}`,
    'POST',
    odataCopy(
      `items('${foreachName}')?['FileRef']`,
      `outputs('Compose_Target_File_Path_${foreachName}')`
    ),
    { [`Compose_Target_File_Path_${foreachName}`]: ['Succeeded'] }
  )
);

const archiveScope = merge(
  spHttp(
    'Get_Old_Folder_Item',
    'GET',
    `@concat('_api/web/lists/getByTitle(''VanBanBanHanh_Ver02'')/items(', string(body('Get_Release_Item')?['IDFolderOld']), ')?$select=Id,FileRef,FileLeafRef,FSObjType')`,
    {}
  ),
  compose(
    'Compose_Expired_Folder_Name',
    `@concat('Expired_', formatDateTime(convertFromUtc(utcNow(), 'SE Asia Standard Time'), 'yyyyMMdd'), '_', outputs('Compose_Sanitized_Tenvanban'))`,
    { Get_Old_Folder_Item: ['Succeeded'] }
  ),
  compose(
    'Compose_Expired_Folder_Path',
    `@concat(body('Get_Old_Folder_Item')?['FileRef'], '/', outputs('Compose_Expired_Folder_Name'))`,
    { Compose_Expired_Folder_Name: ['Succeeded'] }
  ),
  spHttp(
    'Create_Expired_Folder',
    'POST',
    odataAddFolder("body('Get_Old_Folder_Item')?['FileRef']", "outputs('Compose_Expired_Folder_Name')"),
    { Compose_Expired_Folder_Path: ['Succeeded'] }
  ),
  spHttp(
    'List_Old_Files',
    'GET',
    `@concat('_api/web/GetFolderByServerRelativeUrl(@folderPath)/Files?$select=Name,ServerRelativeUrl&@folderPath=''',encodeUriComponent(body('Get_Old_Folder_Item')?['FileRef']),'''')`,
    { Create_Expired_Folder: ['Succeeded'] }
  ),
  spHttp(
    'List_Old_Folders',
    'GET',
    `@concat('_api/web/GetFolderByServerRelativeUrl(@folderPath)/Folders?$select=Name,ServerRelativeUrl&@folderPath=''',encodeUriComponent(body('Get_Old_Folder_Item')?['FileRef']),'''')`,
    { List_Old_Files: ['Succeeded'] }
  ),
  foreach(
    'Move_Old_Files',
    "@body('List_Old_Files')?['value']",
    merge(
      spHttp(
        'Move_One_Old_File',
        'POST',
        odataMoveFile(
          "items('Move_Old_Files')?['ServerRelativeUrl']",
          "concat(outputs('Compose_Expired_Folder_Path'), '/', items('Move_Old_Files')?['Name'])"
        ),
        {}
      )
    ),
    { List_Old_Folders: ['Succeeded'] },
    4
  ),
  foreach(
    'Move_Old_SubFolders',
    "@body('List_Old_Folders')?['value']",
    merge(
      iff(
        'Skip_Forms_Or_Expired',
        `@or(equals(items('Move_Old_SubFolders')?['Name'], 'Forms'),equals(items('Move_Old_SubFolders')?['Name'], outputs('Compose_Expired_Folder_Name')))`,
        {},
        {},
        merge(
          spHttp(
            'Move_One_Old_Folder',
            'POST',
            odataMoveFolder(
              "items('Move_Old_SubFolders')?['ServerRelativeUrl']",
              "concat(outputs('Compose_Expired_Folder_Path'), '/', items('Move_Old_SubFolders')?['Name'])"
            ),
            {}
          )
        )
      )
    ),
    { Move_Old_Files: ['Succeeded'] },
    1
  ),
  spHttp(
    'List_Expired_Files',
    'GET',
    `@concat('_api/web/GetFolderByServerRelativeUrl(@folderPath)/Files?$select=Name,ServerRelativeUrl&@folderPath=''',encodeUriComponent(outputs('Compose_Expired_Folder_Path')),'''')`,
    { Move_Old_SubFolders: ['Succeeded'] }
  ),
  foreach(
    'Stamp_Expired_Files',
    "@body('List_Expired_Files')?['value']",
    merge(
      spHttp(
        'Get_Expired_File_Item',
        'GET',
        `@concat('_api/web/GetFileByServerRelativeUrl(@fileUrl)/ListItemAllFields?$select=Id&@fileUrl=''',encodeUriComponent(items('Stamp_Expired_Files')?['ServerRelativeUrl']),'''')`,
        {}
      ),
      spHttp(
        'Stamp_Expired_HieuLucDen',
        'POST',
        `@concat('_api/web/lists/getByTitle(''VanBanBanHanh_Ver02'')/items(', string(body('Get_Expired_File_Item')?['Id']), ')/ValidateUpdateListItem')`,
        { Get_Expired_File_Item: ['Succeeded'] },
        {
          body: {
            formValues: [
              {
                FieldName: 'HieuLucDen',
                FieldValue: "@formatDateTime(addDays(convertFromUtc(utcNow(), 'SE Asia Standard Time'), -1), 'yyyy-MM-dd')"
              }
            ],
            bNewDocumentUpdate: false
          }
        }
      )
    ),
    { List_Expired_Files: ['Succeeded'] },
    4
  ),
  spHttp(
    'Get_Expired_Folder_ListItem',
    'GET',
    `@concat('_api/web/GetFolderByServerRelativeUrl(@folderPath)/ListItemAllFields?$select=Id&@folderPath=''',encodeUriComponent(outputs('Compose_Expired_Folder_Path')),'''')`,
    { Stamp_Expired_Files: ['Succeeded'] }
  ),
  spHttp(
    'Break_Expired_Folder_ACL',
    'POST',
    `@concat('_api/web/lists/getByTitle(''VanBanBanHanh_Ver02'')/items(', string(body('Get_Expired_Folder_ListItem')?['Id']), ')/breakroleinheritance(copyRoleAssignments=false,clearSubscopes=true)')`,
    { Get_Expired_Folder_ListItem: ['Succeeded'] }
  )
);

const publishActions = merge(
  spHttp(
    'Get_Attachment_Root',
    'GET',
    "_api/web/lists/getByTitle('VanBanGopYThamDinh')/RootFolder?$select=ServerRelativeUrl",
    {}
  ),
  spHttp(
    'Get_Issuance_Root',
    'GET',
    "_api/web/lists/getByTitle('VanBanBanHanh_Ver02')/RootFolder?$select=ServerRelativeUrl",
    { Get_Attachment_Root: ['Succeeded'] }
  ),
  compose(
    'Compose_Sanitized_Tenvanban',
    `@${sanitizeFolderExpr("string(body('Get_Release_Item')?['Tenvanban'])")}`,
    { Get_Issuance_Root: ['Succeeded'] }
  ),
  compose(
    'Compose_Sanitized_IdYeuCau',
    `@${sanitizeFolderExpr("string(body('Get_Release_Item')?['IdYeuCau'])")}`,
    { Compose_Sanitized_Tenvanban: ['Succeeded'] }
  ),
  compose(
    'Compose_Source_Folder',
    `@concat(trim(body('Get_Attachment_Root')?['ServerRelativeUrl']), '/', outputs('Compose_Sanitized_IdYeuCau'))`,
    { Compose_Sanitized_IdYeuCau: ['Succeeded'] }
  ),
  compose(
    'Compose_Target_Relative',
    `@trim(concat(trim(string(body('Get_Release_Item')?['ThuMucBanHanh'])), '/', outputs('Compose_Sanitized_Tenvanban')))`,
    { Compose_Source_Folder: ['Succeeded'] }
  ),
  compose(
    'Compose_Folder_Segments',
    `@split(replace(replace(outputs('Compose_Target_Relative'), '\\\\', '/'), '//', '/'), '/')`,
    { Compose_Target_Relative: ['Succeeded'] }
  ),
  {
    Set_issuanceCurrentPath_Root: {
      type: 'SetVariable',
      inputs: {
        name: 'issuanceCurrentPath',
        value: "@trim(body('Get_Issuance_Root')?['ServerRelativeUrl'])"
      },
      runAfter: { Compose_Folder_Segments: ['Succeeded'] }
    }
  },
  foreach(
    'Ensure_Target_Folder_Segments',
    "@outputs('Compose_Folder_Segments')",
    merge(
      iff(
        'Skip_Empty_Segment',
        `@empty(trim(items('Ensure_Target_Folder_Segments')))`,
        {},
        {},
        ensureFolderActions
      )
    ),
    { Set_issuanceCurrentPath_Root: ['Succeeded'] },
    1
  ),
  spHttp(
    'Get_Existing_Target_Files',
    'GET',
    `@concat('_api/web/lists/getByTitle(''VanBanBanHanh_Ver02'')/items?$select=Id,FileRef&$top=1&$filter=FSObjType eq 0 and startswith(FileRef,''', replace(concat(variables('issuanceCurrentPath'), '/'), '''', ''''''), ''')')`,
    { Ensure_Target_Folder_Segments: ['Succeeded'] }
  ),
  iff(
    'Condition_Already_Published',
    `@and(not(contains(string(body('Get_Release_Item')?['BodyEmail']), '{{LinkFile}}')),greater(length(body('Get_Existing_Target_Files')?['value']), 0))`,
    { Get_Existing_Target_Files: ['Succeeded'] },
    merge(
      terminate(
        'Terminate_Already_Published',
        'Succeeded',
        {},
        'Idempotent skip: BodyEmail no longer has {{LinkFile}} and target folder already has files.'
      )
    ),
    merge(
      spHttp(
        'Get_Source_Files',
        'GET',
        `@concat('_api/web/lists/getByTitle(''VanBanGopYThamDinh'')/items?$select=Id,FileLeafRef,FileRef,FileDirRef,FSObjType,IsBieuMau&$top=500&$orderby=Modified desc&$filter=FileDirRef eq ''', replace(outputs('Compose_Source_Folder'), '''', ''''''), ''' and FSObjType eq 0')`,
        {}
      ),
      iff(
        'Condition_No_Source_Files',
        `@empty(body('Get_Source_Files')?['value'])`,
        { Get_Source_Files: ['Succeeded'] },
        merge(
          terminate(
            'Terminate_No_Source_Files',
            'Failed',
            {},
            'Không tìm thấy file đính kèm để chuyển sang thư viện ban hành.'
          )
        ),
        merge(
          query(
            'Filter_Main_Document',
            "@body('Get_Source_Files')?['value']",
            `@equals(string(item()?['Id']), string(body('Get_Release_Item')?['IdVanBanChinh']))`,
            {}
          ),
          iff(
            'Condition_No_Main_Document',
            `@or(empty(body('Get_Release_Item')?['IdVanBanChinh']),empty(body('Filter_Main_Document')))`,
            { Filter_Main_Document: ['Succeeded'] },
            merge(
              terminate(
                'Terminate_No_Main_Document',
                'Failed',
                {},
                'Văn bản chính (IdVanBanChinh) không thuộc file đính kèm của yêu cầu.'
              )
            ),
            merge(
              query(
                'Filter_Form_Files',
                "@body('Get_Source_Files')?['value']",
                "@equals(item()?['IsBieuMau'], true)",
                {}
              ),
              query(
                'Filter_Draft_Files',
                "@body('Get_Source_Files')?['value']",
                "@not(equals(item()?['IsBieuMau'], true))",
                { Filter_Form_Files: ['Succeeded'] }
              ),
              iff(
                'Condition_Archive_DieuChinh',
                `@and(equals(trim(string(body('Get_Release_Item')?['LoaiYeuCau'])), 'Điều chỉnh'),greater(int(coalesce(body('Get_Release_Item')?['IDFolderOld'], 0)), 0))`,
                { Filter_Draft_Files: ['Succeeded'] },
                archiveScope,
                {}
              ),
              foreach(
                'Copy_Draft_Files',
                "@body('Filter_Draft_Files')",
                copyOneFile('Copy_Draft_Files', false),
                { Condition_Archive_DieuChinh: ['Succeeded'] },
                4
              ),
              foreach(
                'Copy_Form_Files',
                "@body('Filter_Form_Files')",
                copyOneFile('Copy_Form_Files', true),
                { Copy_Draft_Files: ['Succeeded'] },
                4
              ),
              compose(
                'Compose_Today',
                "@formatDateTime(convertFromUtc(utcNow(), 'SE Asia Standard Time'), 'yyyy-MM-dd')",
                { Copy_Form_Files: ['Succeeded'] }
              ),
              compose(
                'Compose_HieuLucTu',
                "@if(empty(body('Get_Release_Item')?['HieuLucTu']), outputs('Compose_Today'), formatDateTime(body('Get_Release_Item')?['HieuLucTu'], 'yyyy-MM-dd'))",
                { Compose_Today: ['Succeeded'] }
              ),
              compose(
                'Compose_LienHe',
                "@trim(coalesce(body('Get_Release_Item')?['LienHe'], coalesce(body('Get_Release_Item')?['NguoiTao'], body('Get_Release_Item')?['EmailNguoiTao'])))",
                { Compose_HieuLucTu: ['Succeeded'] }
              ),
              compose(
                'Compose_Metadata_Base',
                [
                  { FieldName: 'TomTatVanban', FieldValue: "@{trim(string(coalesce(body('Get_Release_Item')?['TomTatNoiDung'], '')))}" },
                  { FieldName: 'NgayPhatHanh', FieldValue: "@{outputs('Compose_Today')}" },
                  { FieldName: 'HieuLucTu', FieldValue: "@{outputs('Compose_HieuLucTu')}" },
                  { FieldName: 'LienHe', FieldValue: "@{outputs('Compose_LienHe')}" }
                ],
                { Compose_LienHe: ['Succeeded'] }
              ),
              compose(
                'Compose_Metadata_Values',
                "@if(empty(body('Get_Release_Item')?['HieuLucDen']), outputs('Compose_Metadata_Base'), union(outputs('Compose_Metadata_Base'), createArray(json(concat('{\"FieldName\":\"HieuLucDen\",\"FieldValue\":\"', formatDateTime(body('Get_Release_Item')?['HieuLucDen'], 'yyyy-MM-dd'), '\"}')))))",
                { Compose_Metadata_Base: ['Succeeded'] }
              ),
              spHttp(
                'Get_Reader_Role',
                'GET',
                '_api/web/roledefinitions/getByType(2)?$select=Id',
                { Compose_Metadata_Values: ['Succeeded'] }
              ),
              foreach(
                'Stamp_Copied_Files',
                "@body('Get_Source_Files')?['value']",
                merge(
                  compose(
                    'Compose_Copied_Path',
                    `@if(equals(items('Stamp_Copied_Files')?['IsBieuMau'], true), concat(variables('issuanceCurrentPath'), '/', items('Stamp_Copied_Files')?['FileLeafRef']), concat(variables('issuanceCurrentPath'), substring(items('Stamp_Copied_Files')?['FileRef'], length(outputs('Compose_Source_Folder')))))`,
                    {}
                  ),
                  spHttp(
                    'Get_Copied_Item_Fields',
                    'GET',
                    `@concat('_api/web/GetFileByServerRelativeUrl(@fileUrl)/ListItemAllFields?$select=Id&@fileUrl=''',encodeUriComponent(outputs('Compose_Copied_Path')),'''')`,
                    { Compose_Copied_Path: ['Succeeded'] }
                  ),
                  iff(
                    'Condition_Is_Form_File',
                    `@equals(items('Stamp_Copied_Files')?['IsBieuMau'], true)`,
                    { Get_Copied_Item_Fields: ['Succeeded'] },
                    merge(
                      spHttp(
                        'Stamp_Form_Metadata',
                        'POST',
                        `@concat('_api/web/lists/getByTitle(''VanBanBanHanh_Ver02'')/items(', string(body('Get_Copied_Item_Fields')?['Id']), ')/ValidateUpdateListItem')`,
                        {},
                        {
                          body: {
                            formValues: "@union(outputs('Compose_Metadata_Values'), createArray(json('{\"FieldName\":\"IsBieuMau\",\"FieldValue\":\"1\"}')))",
                            bNewDocumentUpdate: false
                          }
                        }
                      ),
                      spHttp(
                        'Break_Form_ACL',
                        'POST',
                        `@concat('_api/web/lists/getByTitle(''VanBanBanHanh_Ver02'')/items(', string(body('Get_Copied_Item_Fields')?['Id']), ')/breakroleinheritance(copyRoleAssignments=false,clearSubscopes=true)')`,
                        { Stamp_Form_Metadata: ['Succeeded'] }
                      ),
                      spHttp(
                        'Grant_Form_Read',
                        'POST',
                        `@concat('_api/web/lists/getByTitle(''VanBanBanHanh_Ver02'')/items(', string(body('Get_Copied_Item_Fields')?['Id']), ')/roleassignments/addroleassignment(principalid=', string(int(triggerBody()?['roleGroupID'])), ',roleDefId=', string(body('Get_Reader_Role')?['Id']), ')')`,
                        { Break_Form_ACL: ['Succeeded'] }
                      )
                    ),
                    merge(
                      spHttp(
                        'Stamp_Draft_Metadata',
                        'POST',
                        `@concat('_api/web/lists/getByTitle(''VanBanBanHanh_Ver02'')/items(', string(body('Get_Copied_Item_Fields')?['Id']), ')/ValidateUpdateListItem')`,
                        {},
                        {
                          body: {
                            formValues: "@outputs('Compose_Metadata_Values')",
                            bNewDocumentUpdate: false
                          }
                        }
                      )
                    )
                  )
                ),
                { Get_Reader_Role: ['Succeeded'] },
                4
              ),
              spHttp(
                'Get_Target_Folder_ListItem',
                'GET',
                `@concat('_api/web/GetFolderByServerRelativeUrl(@folderPath)/ListItemAllFields?$select=Id&@folderPath=''',encodeUriComponent(variables('issuanceCurrentPath')),'''')`,
                { Stamp_Copied_Files: ['Succeeded'] }
              ),
              spHttp(
                'Stamp_Target_Folder',
                'POST',
                `@concat('_api/web/lists/getByTitle(''VanBanBanHanh_Ver02'')/items(', string(body('Get_Target_Folder_ListItem')?['Id']), ')/ValidateUpdateListItem')`,
                { Get_Target_Folder_ListItem: ['Succeeded'] },
                {
                  body: {
                    formValues: "@outputs('Compose_Metadata_Values')",
                    bNewDocumentUpdate: false
                  }
                }
              ),
              spHttp(
                'Get_ShortUrl_ApiKey',
                'GET',
                "_api/web/lists/getByTitle('lstConfigLabelCustom')/items?$select=Label,Value&$filter=Label eq 'apiKeyShortLink'&$top=1",
                { Stamp_Target_Folder: ['Succeeded'] }
              ),
              iff(
                'Condition_Missing_ApiKey',
                `@empty(first(body('Get_ShortUrl_ApiKey')?['value'])?['Value'])`,
                { Get_ShortUrl_ApiKey: ['Succeeded'] },
                merge(
                  terminate(
                    'Terminate_Missing_ApiKey',
                    'Failed',
                    {},
                    'Thiếu apiKeyShortLink trên lstConfigLabelCustom.'
                  )
                ),
                merge(
                  compose(
                    'Compose_Site_Origin',
                    "@concat(split(triggerBody()?['siteUrl'], '/')[0], '//', split(triggerBody()?['siteUrl'], '/')[2])",
                    {}
                  ),
                  compose(
                    'Compose_Main_File_Path',
                    `@concat(variables('issuanceCurrentPath'), substring(first(body('Filter_Main_Document'))?['FileRef'], length(outputs('Compose_Source_Folder'))))`,
                    { Compose_Site_Origin: ['Succeeded'] }
                  ),
                  compose(
                    'Compose_File_Long_Url',
                    `@concat(outputs('Compose_Site_Origin'), replace(encodeUriComponent(outputs('Compose_Main_File_Path')), '%2F', '/'), '?web=1')`,
                    { Compose_Main_File_Path: ['Succeeded'] }
                  ),
                  compose(
                    'Compose_Folder_Long_Url',
                    `@concat(first(split(triggerBody()?['webPartPageUrl'], '#')), '#/tab/ThuVienTaiLieu/folder/', string(body('Get_Target_Folder_ListItem')?['Id']))`,
                    { Compose_File_Long_Url: ['Succeeded'] }
                  ),
                  http(
                    'Create_ShortUrl_LinkFile',
                    "@triggerBody()?['endPointShortUrl']",
                    {
                      longUrl: "@outputs('Compose_File_Long_Url')",
                      tags: ['mas_phvb'],
                      shortCodeLength: 9,
                      forwardQuery: true
                    },
                    { 'X-Api-Key': "@first(body('Get_ShortUrl_ApiKey')?['value'])?['Value']" },
                    { Compose_Folder_Long_Url: ['Succeeded'] }
                  ),
                  http(
                    'Create_ShortUrl_LinkTatCaTaiLieu',
                    "@triggerBody()?['endPointShortUrl']",
                    {
                      longUrl: "@outputs('Compose_Folder_Long_Url')",
                      tags: ['mas_phvb'],
                      shortCodeLength: 9,
                      forwardQuery: true
                    },
                    { 'X-Api-Key': "@first(body('Get_ShortUrl_ApiKey')?['value'])?['Value']" },
                    { Create_ShortUrl_LinkFile: ['Succeeded'] }
                  ),
                  compose(
                    'Compose_Resolved_Body',
                    `@replace(replace(string(coalesce(body('Get_Release_Item')?['BodyEmail'], '')), '{{LinkFile}}', string(body('Create_ShortUrl_LinkFile')?['shortUrl'])), '{{LinkTatCaTaiLieu}}', string(body('Create_ShortUrl_LinkTatCaTaiLieu')?['shortUrl']))`,
                    { Create_ShortUrl_LinkTatCaTaiLieu: ['Succeeded'] }
                  ),
                  spHttp(
                    'Patch_BodyEmail',
                    'POST',
                    `@concat('_api/web/lists/getByTitle(''InDoc_Release'')/items(', string(body('Get_Release_Item')?['Id']), ')')`,
                    { Compose_Resolved_Body: ['Succeeded'] },
                    {
                      headers: {
                        'IF-MATCH': '*',
                        'X-HTTP-Method': 'MERGE'
                      },
                      body: {
                        BodyEmail: "@outputs('Compose_Resolved_Body')"
                      }
                    }
                  ),
                  iff(
                    'Condition_Can_Send_Confirm_Mail',
                    `@and(not(empty(trim(string(body('Get_Release_Item')?['EmailNhanBanHanh'])))),not(empty(trim(string(body('Get_Release_Item')?['SubjectBanHanh'])))),not(empty(trim(outputs('Compose_Resolved_Body')))),not(empty(trim(string(body('Get_Release_Item')?['SoVanBan'])))))`,
                    { Patch_BodyEmail: ['Succeeded'] },
                    merge(
                      http(
                        'Send_Confirm_Mail',
                        "@triggerBody()?['endPointSendMail']",
                        {
                          EmailTo: "@body('Get_Release_Item')?['EmailNhanBanHanh']",
                          Subject: "@body('Get_Release_Item')?['SubjectBanHanh']",
                          Body: "@outputs('Compose_Resolved_Body')"
                        },
                        {},
                        {}
                      )
                    ),
                    merge(
                      terminate(
                        'Terminate_Missing_Confirm_Mail',
                        'Failed',
                        {},
                        'Không tạo được nội dung email xác nhận ban hành (thiếu EmailNhanBanHanh, SubjectBanHanh, Body hoặc SoVanBan).'
                      )
                    )
                  ),
                  iff(
                    'Condition_Can_Send_Storage_Mail',
                    `@and(not(empty(trim(string(body('Get_Release_Item')?['EmailNguoiTao'])))),not(empty(trim(string(body('Get_Release_Item')?['NguoiTao'])))))`,
                    { Condition_Can_Send_Confirm_Mail: ['Succeeded'] },
                    merge(
                      spHttp(
                        'Get_Storage_Mail_Template',
                        'GET',
                        "_api/web/lists/getByTitle('lstConfigNoiDungMail')/items?$select=MaLoaiMail,TieuDeMail,NoiDungMail&$filter=MaLoaiMail eq 'THONG_BAO_LUU_TRU'&$top=1",
                        {}
                      ),
                      compose(
                        'Compose_Storage_Subject',
                        `@replace(replace(replace(replace(replace(string(coalesce(first(body('Get_Storage_Mail_Template')?['value'])?['TieuDeMail'], '')), '{{TenVanBan}}', string(body('Get_Release_Item')?['Tenvanban'])), '{{TomTatNoiDung}}', string(coalesce(body('Get_Release_Item')?['TomTatNoiDung'], ''))), '{{IDYeuCau}}', string(body('Get_Release_Item')?['IdYeuCau'])), '{{NguoiThucHien}}', string(triggerBody()?['nguoiThucHien'])), '{{NguoiTao}}', string(body('Get_Release_Item')?['NguoiTao']))`,
                        { Get_Storage_Mail_Template: ['Succeeded'] }
                      ),
                      compose(
                        'Compose_Storage_Body',
                        `@replace(replace(replace(replace(replace(replace(string(coalesce(first(body('Get_Storage_Mail_Template')?['value'])?['NoiDungMail'], '')), '{{TenVanBan}}', string(body('Get_Release_Item')?['Tenvanban'])), '{{TomTatNoiDung}}', replace(replace(string(coalesce(body('Get_Release_Item')?['TomTatNoiDung'], '')), '\n', '<br/>'), '\r', '')), '{{IDYeuCau}}', string(body('Get_Release_Item')?['IdYeuCau'])), '{{NguoiThucHien}}', string(triggerBody()?['nguoiThucHien'])), '{{NguoiTao}}', string(body('Get_Release_Item')?['NguoiTao'])), '{{SoVanBan}}', string(coalesce(body('Get_Release_Item')?['SoVanBan'], '')))`,
                        { Compose_Storage_Subject: ['Succeeded'] }
                      ),
                      iff(
                        'Condition_Storage_Template_Ready',
                        `@and(not(empty(trim(outputs('Compose_Storage_Subject')))),not(empty(trim(outputs('Compose_Storage_Body')))))`,
                        { Compose_Storage_Body: ['Succeeded'] },
                        merge(
                          http(
                            'Send_Storage_Mail',
                            "@triggerBody()?['endPointSendMail']",
                            {
                              EmailTo: "@body('Get_Release_Item')?['EmailNguoiTao']",
                              Subject: "@outputs('Compose_Storage_Subject')",
                              Body: "@outputs('Compose_Storage_Body')"
                            },
                            {},
                            {}
                          )
                        ),
                        {}
                      )
                    ),
                    {}
                  )
                )
              )
            )
          )
        )
      )
    )
  )
);

const definition = {
  $schema: 'https://schema.management.azure.com/providers/Microsoft.Logic/schemas/2016-06-01/workflowdefinition.json#',
  contentVersion: '10.0.0.1',
  parameters: {
    $connections: { defaultValue: {}, type: 'Object' },
    $authentication: { defaultValue: {}, type: 'SecureObject' }
  },
  triggers: {
    manual: {
      type: 'Request',
      kind: 'Http',
      inputs: {
        schema: {
          type: 'object',
          properties: {
            siteUrl: { type: 'string' },
            itemId: { type: 'integer' },
            endPointSendMail: { type: 'string' },
            endPointShortUrl: { type: 'string' },
            webPartPageUrl: { type: 'string' },
            roleGroupID: { type: 'string' },
            nguoiThucHien: { type: 'string' }
          },
          required: [
            'siteUrl',
            'itemId',
            'endPointSendMail',
            'endPointShortUrl',
            'webPartPageUrl',
            'roleGroupID',
            'nguoiThucHien'
          ]
        }
      }
    }
  },
  actions: merge(
    {
      Respond_Accepted: {
        type: 'Response',
        kind: 'Http',
        inputs: {
          statusCode: 202,
          body: {
            accepted: true,
            itemId: "@triggerBody()?['itemId']"
          }
        },
        runAfter: {}
      }
    },
  {
    Init_issuanceCurrentPath: {
      type: 'InitializeVariable',
      inputs: {
        variables: [
          {
            name: 'issuanceCurrentPath',
            type: 'string',
            value: ''
          }
        ]
      },
      runAfter: { Respond_Accepted: ['Succeeded'] }
    }
  },
  iff(
      'Condition_Missing_Required',
      missingRequiredExpr,
      { Init_issuanceCurrentPath: ['Succeeded'] },
      merge(
        terminate(
          'Terminate_Missing_Required',
          'Failed',
          {},
          'Thiếu field bắt buộc trên body: siteUrl, itemId, endPointSendMail, endPointShortUrl, webPartPageUrl, roleGroupID, nguoiThucHien.'
        )
      ),
      merge(
        spHttp(
          'Get_Release_Item',
          'GET',
          `@concat('_api/web/lists/getByTitle(''InDoc_Release'')/items(', string(triggerBody()?['itemId']), ')?$select=${RELEASE_SELECT}')`,
          {}
        ),
        iff(
          'Condition_Missing_IdYeuCau',
          `@empty(trim(string(body('Get_Release_Item')?['IdYeuCau'])))`,
          { Get_Release_Item: ['Succeeded'] },
          merge(
            terminate(
              'Terminate_Missing_IdYeuCau',
              'Failed',
              {},
              'Item InDoc_Release thiếu IdYeuCau.'
            )
          ),
          merge(
            iff(
              'Condition_Is_Full_Issuance',
              isFullIssuanceExpr,
              {},
              merge(scope('Scope_BanHanh', publishActions, {})),
              merge(
                terminate(
                  'Terminate_Not_Full_Issuance',
                  'Cancelled',
                  {},
                  'LoaiYeuCau không phải Tạo mới hoặc Điều chỉnh. Flow không xử lý Thu hồi.'
                )
              )
            )
          )
        )
      )
    )
  ),
  outputs: {}
};

const packageDefinition = {
  name: FLOW_ID,
  id: `/providers/Microsoft.Flow/flows/${FLOW_ID}`,
  type: 'Microsoft.Flow/flows',
  properties: {
    apiId: '/providers/Microsoft.PowerApps/apis/shared_logicflows',
    displayName: DISPLAY_NAME,
    definition,
    connectionReferences: {
      shared_sharepointonline: {
        source: 'Embedded',
        id: '/providers/Microsoft.PowerApps/apis/shared_sharepointonline',
        displayName: 'SharePoint',
        isProcessWide: false
      }
    },
    flowFailureAlertSubscribed: false
  }
};

const manifest = {
  packageSchemaVersion: '1.0',
  details: {
    displayName: DISPLAY_NAME,
    description:
      'HTTP fire-and-forget Ban hành PHVB: Response 202 rồi copy/stamp/archive/short URL/mail. Chỉ Tạo mới và Điều chỉnh (kể cả DMVL). Không ghi Log, không ghi LichSuThucHien, không PATCH StatusApproved.',
    createdTime: '2026-09-15T00:00:00Z',
    packageTelemetryId: FLOW_ID
  },
  resources: {
    [FLOW_ID]: {
      type: 'Microsoft.Flow/flows',
      suggestedCreationType: 'New',
      displayName: DISPLAY_NAME,
      details: { displayName: DISPLAY_NAME },
      configurableBy: 'User',
      hierarchy: 'Root',
      dependsOn: ['shared_sharepointonline']
    },
    shared_sharepointonline: {
      id: '/providers/Microsoft.PowerApps/apis/shared_sharepointonline',
      name: 'shared_sharepointonline',
      type: 'Microsoft.PowerApps/apis',
      suggestedCreationType: 'Existing',
      details: { displayName: 'SharePoint' },
      configurableBy: 'User',
      hierarchy: 'Child',
      dependsOn: []
    }
  }
};

const sampleBody = {
  siteUrl: 'https://contoso.sharepoint.com/sites/phvb',
  itemId: 123,
  endPointSendMail: 'https://prod-xx.region.logic.azure.com/workflows/.../triggers/manual/paths/invoke',
  endPointShortUrl: 'https://s.masterisehomes.com/rest/v3/short-urls',
  webPartPageUrl: 'https://contoso.sharepoint.com/sites/phvb/SitePages/PHVB.aspx',
  roleGroupID: '10',
  nguoiThucHien: 'Nguyen Van A'
};

const flowDir = path.join(__dirname, 'Microsoft.Flow', 'flows', FLOW_ID);
fs.mkdirSync(flowDir, { recursive: true });
fs.writeFileSync(path.join(flowDir, 'definition.json'), JSON.stringify(packageDefinition, null, 2), 'utf8');
fs.writeFileSync(path.join(__dirname, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');
fs.writeFileSync(path.join(__dirname, 'sample-body.json'), JSON.stringify(sampleBody, null, 2), 'utf8');

console.log('Wrote manifest.json, sample-body.json, Microsoft.Flow/flows/' + FLOW_ID + '/definition.json');

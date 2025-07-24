/**
 * 格式化联系人显示名称
 * @param contact 联系人对象
 * @returns 格式化后的显示名称
 */
export function formatContactName(contact: any): string {
  return contact.Remark || contact.NickName || contact.Alias || contact.UserName || '未知联系人'
}

/**
 * 检查是否为聊天群
 * @param userName 用户名
 * @returns 是否为聊天群
 */
export function isChatRoom(userName: string): boolean {
  if (!userName) return false
  
  const chatRoomPatterns = [
    '@chatroom',
    '@openim',
    '@kefu.openim',
    '@im.chatroom'
  ]
  
  return chatRoomPatterns.some(pattern => userName.includes(pattern))
}

/**
 * 过滤掉聊天群，只保留真实联系人
 * @param contacts 联系人列表
 * @returns 过滤后的联系人列表
 */
export function filterRealContacts(contacts: any[]): any[] {
  return contacts.filter(contact => !isChatRoom(contact.UserName || ''))
}
export function inviteLink(invitationId: string, baseUrl: string): string {
  return `${baseUrl.replace(/\/$/, "")}/convite/${invitationId}`;
}

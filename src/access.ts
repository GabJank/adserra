export function hasAssociationAccess(status: string | null | undefined) {
  const normalizedStatus = status?.trim().toLowerCase();

  return normalizedStatus === 'admin' || normalizedStatus === 'associated';
}

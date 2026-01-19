export const Resources = {
  EMPLOYEE: "EMPLOYEE",
  EMPLOYMENT: "EMPLOYMENT",
  USER: "USER",
  COMPANY: "COMPANY",
  ROLE: "ROLE",
  LEAVE_TYPE: "LEAVE_TYPE",
  LEAVE_APPLICATION: "LEAVE_APPLICATION",
  LEAVE_BALANCE: "LEAVE_BALANCE",
  LEAVE_RECALL: "LEAVE_RECALL",
  PUBLIC_HOLIDAY: "PUBLIC_HOLIDAY",
  LEAVE_SETTINGS: "LEAVE_SETTINGS",
};

export const Actions = {
  CREATE: "create",
  READ: "read",
  UPDATE: "update",
  DELETE: "delete",
};

export const Scopes = {
  ANY: "any",
  OWN: "own",
};

export const ActionTypes = {
  CREATE_ANY: `${Actions.CREATE}:${Scopes.ANY}`,
  CREATE_OWN: `${Actions.CREATE}:${Scopes.OWN}`,
  READ_ANY: `${Actions.READ}:${Scopes.ANY}`,
  READ_OWN: `${Actions.READ}:${Scopes.OWN}`,
  UPDATE_ANY: `${Actions.UPDATE}:${Scopes.ANY}`,
  UPDATE_OWN: `${Actions.UPDATE}:${Scopes.OWN}`,
  DELETE_ANY: `${Actions.DELETE}:${Scopes.ANY}`,
  DELETE_OWN: `${Actions.DELETE}:${Scopes.OWN}`,
};

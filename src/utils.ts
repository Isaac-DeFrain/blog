// Utility functions for creating HTML elements

export const div = <T>(className: T, content: T): string => {
  return `<div class="${className}">${content}</div>`;
};

export const li = <T>(className: T, content: T): string => {
  return `<li class="${className}">${content}</li>`;
};

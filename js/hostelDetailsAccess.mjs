export function getHostelDetailsAccessState(token, role) {
  if (!token) {
    return {
      shouldRedirect: false,
      canSubmit: false,
      message: "Login required: Please login first, then come back and send inquiry.",
    };
  }

  if (role !== "STUDENT") {
    return {
      shouldRedirect: false,
      canSubmit: false,
      message: `Student account required: Only students can send inquiries. Your current role is: ${role || "None"}`,
    };
  }

  return {
    shouldRedirect: false,
    canSubmit: true,
    message: "",
  };
}

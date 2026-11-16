const email = window.supportEmail;
if (email) {
  const address = document.querySelector("#support-address");
  address.textContent = email;
  address.href = `mailto:${email}`;
  document.querySelectorAll("[data-subject]").forEach((link) => {
    link.href = `mailto:${email}?subject=${encodeURIComponent(link.dataset.subject)}`;
  });
  document.querySelector("#contact-options").hidden = false;
  document.querySelector("#contact-unavailable").hidden = true;
}

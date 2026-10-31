function createHostelCard(data) {
  return `
    <div class="hostel-card">
      <img src="${data.image}" class="hostel-img" />

      <div class="hostel-content">
        <div class="hostel-title">${data.name}</div>
        <div class="hostel-location">${data.location}</div>

        <div class="tags">
          ${data.tags.map(tag => `<span class="tag">${tag}</span>`).join("")}
        </div>

        <div class="price">₹${data.price}/mo</div>

        <div class="actions">
          <button class="btn-primary">Schedule Visit</button>
          <button class="btn-outline">Request Callback</button>
        </div>
      </div>
    </div>
  `;
}
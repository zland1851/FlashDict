/**
 * Tab Menu Component
 * Handles tab switching functionality in options page
 */

function switchTab(e: Event): void {
  const target = e.target as HTMLElement;
  const contentId = target.dataset.contentid;

  if (!contentId) return;

  // Hide all tab content
  const tabContents = document.getElementsByClassName('tabcontent');
  for (let i = 0; i < tabContents.length; i++) {
    (tabContents[i] as HTMLElement).style.display = 'none';
  }

  // Show selected tab content
  const selectedContent = document.getElementById(contentId);
  if (selectedContent) {
    selectedContent.style.display = 'block';
  }

  // Update tab menu active states
  const tabMenus = document.getElementsByClassName('tabmenu');
  for (let i = 0; i < tabMenus.length; i++) {
    const tabMenu = tabMenus[i];
    if (tabMenu) {
      tabMenu.className = 'tabmenu';
    }
  }
  target.className = 'tabmenu active';
}

// Initialize tab menu event listeners
function initTabMenu(): void {
  const menus = document.querySelectorAll('.tabmenu');
  menus.forEach(menu => {
    menu.addEventListener('click', switchTab, false);
  });
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initTabMenu);
} else {
  initTabMenu();
}

export { switchTab, initTabMenu };

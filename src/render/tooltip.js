function renderSource(source = {}) {
  const sourceName = source.sourceName || '未核验 / Unverified';
  const checkedAt = source.checkedAt || '未记录 / Not recorded';
  const sourceUrl = source.sourceUrl
    ? `<a href="${source.sourceUrl}" target="_blank" rel="noreferrer">查看来源 / Open source</a>`
    : '<span>暂无可公开链接 / No public link in demo</span>';

  return `
    <div class="tooltip-meta-row"><span>来源 / Source</span><strong>${sourceName}</strong></div>
    <div class="tooltip-meta-row"><span>核验日期 / Checked</span><strong>${checkedAt}</strong></div>
    <div class="tooltip-meta-row"><span>链接 / Link</span><strong>${sourceUrl}</strong></div>
    ${source.notes ? `<p class="tooltip-note">${source.notes}</p>` : ''}
  `;
}

function renderServices(services = []) {
  if (!services.length) {
    return '<p class="tooltip-note">暂无服务信息 / No service entries loaded.</p>';
  }

  const items = services
    .map(
      (service) => `
        <li>
          <strong>${service.directionZh}</strong>
          <span>${service.directionEn}</span>
          <span>${service.serviceStatusZh} / ${service.serviceStatusEn}</span>
          <span>首班 / First: ${service.firstTrain ?? service.firstTrainNote}</span>
          <span>末班 / Last: ${service.lastTrain ?? service.lastTrainNote}</span>
        </li>
      `
    )
    .join('');

  return `<ul class="tooltip-service-list">${items}</ul>`;
}

export function createTooltip({ element, stageElement }) {
  function setPosition(targetElement) {
    const targetBox = targetElement.getBoundingClientRect();
    const stageBox = stageElement.getBoundingClientRect();
    const maxLeft = stageBox.width - element.offsetWidth - 16;
    const preferredLeft = targetBox.left - stageBox.left + targetBox.width / 2 + 16;
    const preferredTop = targetBox.top - stageBox.top - element.offsetHeight - 12;

    element.style.left = `${Math.max(16, Math.min(maxLeft, preferredLeft))}px`;
    element.style.top = `${Math.max(16, preferredTop)}px`;
  }

  function show({ station, line, services, targetElement }) {
    element.innerHTML = `
      <div class="tooltip-header">
        <div>
          <p class="tooltip-kicker">${line.shortName} · ${line.englishName}</p>
          <h3>${station.name.zh}</h3>
          <p>${station.name.en}</p>
        </div>
        <span class="tooltip-status">${station.status}</span>
      </div>
      <div class="tooltip-body">
        <div class="tooltip-meta-row"><span>类别 / Category</span><strong>${line.category}</strong></div>
        <div class="tooltip-meta-row"><span>站点类型 / Station</span><strong>${station.isTransfer ? '换乘预备 / Transfer-ready' : '普通站 / Standard'}</strong></div>
        ${station.transferLines?.length ? `<div class="tooltip-meta-row"><span>换乘框架 / Transfers</span><strong>${station.transferLines.join(' · ')}</strong></div>` : ''}
        ${renderServices(services)}
        ${renderSource(station.source)}
      </div>
    `;

    element.setAttribute('aria-hidden', 'false');
    element.classList.add('is-visible');
    requestAnimationFrame(() => setPosition(targetElement));
  }

  function hide() {
    element.classList.remove('is-visible');
    element.setAttribute('aria-hidden', 'true');
  }

  return { show, hide };
}

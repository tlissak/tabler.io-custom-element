"""Convert rendered reference snapshots into authored custom-element examples.

Usage: python scripts/convert-admin-theme.py --snapshots PATH
Snapshots are taken after the original fixture scripts run, preserving their
populated tables, SVG chart, balances, French prose, and selection defaults.
"""
import argparse
import json
import shutil
from pathlib import Path
from bs4 import BeautifulSoup, Tag

ROOT = Path(__file__).resolve().parents[1]
REFERENCE = ROOT.parent / '05-admin-theme'
OUTPUT = ROOT / 'examples/admin-theme'


def text(node):
    return node.get_text(' ', strip=True) if node else ''


def direct(node, selector):
    return next((child for child in node.select(selector) if child.parent is node), None)


def classes(node):
    return node.get('class', [])


def convert(snapshot):
    soup = BeautifulSoup(snapshot.read_text(encoding='utf-8'), 'html.parser')
    def element(tag, **attrs):
        return soup.new_tag(tag, attrs=attrs)
    def wrap(slot, node):
        holder = element('div', slot=slot)
        holder.append(node.extract())
        return holder
    def rename(node, tag, remove=()):
        node.name = tag
        node['class'] = [c for c in classes(node) if c not in remove]
        if not node['class']: del node['class']
        return node

    for script in soup.select('script'): script.decompose()
    for link in soup.select('link[rel="stylesheet"]'):
        if link.get('href') == 'styles.css': link['href'] = 'reference-layout.css'
        elif 'icons-webfont' in link.get('href', ''): link.decompose()
    soup.html['data-tblr-theme'] = 'admin'
    soup.head.append(element('link', rel='stylesheet', href='../../src/styles/admin-theme.css'))
    soup.head.append(element('link', rel='stylesheet', href='custom-elements.css'))
    soup.body['class'] = ['admin-reference']
    soup.body['data-reference-page'] = snapshot.stem
    for node in soup.select('[data-today]'):
        node.string = 'lundi 5 octobre 2026'
    for node in soup.select('[onsubmit]'): del node['onsubmit']
    for node in soup.select('a[href="README.md"]'): node['href'] = 'REFERENCE.md'

    # Convert the fixture icons into real icon elements; assets are vendored locally.
    for node in list(soup.select('i.ti')):
        name = next((c[3:] for c in classes(node) if c.startswith('ti-')), 'circle')
        rename(node, 'tblr-icon', classes(node))
        node['name'] = 'heart-handshake' if name == 'handshake' else name
        node['base-url'] = './icons'
        node['aria-hidden'] = 'true'

    for node in list(soup.select('.avatar, .agent-mark')):
        agent = 'agent-mark' in classes(node)
        initials = text(node)
        icon = node.find('tblr-icon')
        rename(node, 'tblr-avatar', ['avatar', 'agent-mark'])
        node['label'] = 'Fil' if agent else initials
        if agent: node['variant'] = 'agent'
        if icon: icon['slot'] = 'icon'
        else:
            node['initials'] = initials
            node.clear()

    for node in list(soup.select('.badge, .lvl')):
        palette = {'b-success': 'success', 'b-warning': 'warning', 'b-danger': 'danger', 'b-info': 'info', 'b-neutral': 'secondary', 'b-navy': 'dark', 'lvl-0': 'secondary', 'lvl-1': 'info', 'lvl-2': 'warning', 'lvl-3': 'danger'}
        color = next((palette[c] for c in classes(node) if c in palette), 'secondary')
        rename(node, 'tblr-badge', ['badge', *palette, 'lg', 'lvl'])
        node['color'] = color
        node['light'] = ''
        if color == 'dark':
            del node['light']
            node['style'] = '--tblr-badge-dark-solid-bg:var(--tblr-navy)'

    # The preview component owns the confirmation controls, not the old data-do buttons.
    for node in list(soup.select('.confirm')):
        heading = node.select_one('.confirm-head')
        body = node.select_one('.confirm-body')
        foot = node.select_one('.confirm-foot')
        confirm = node.select_one('[data-do]')
        cancel = node.select_one('[data-cancel]')
        hint = node.select_one('.hint')
        title = text(heading)
        journal = confirm.get('data-journal', '') if confirm else ''
        rename(node, 'tblr-action-preview', ['confirm'])
        node['class'] = classes(node) + ['admin-preview']
        node['title'] = title
        node['confirm-label'] = text(confirm) or 'Confirmer'
        node['cancel-label'] = text(cancel) or 'Annuler'
        node['data-journal'] = journal
        if heading:
            heading['slot'] = 'header'
            heading['class'] = ['admin-confirm-heading']
        if body:
            exclusion = body.select_one('.no')
            if exclusion: node.append(wrap('exclusions', exclusion))
            body['slot'] = 'changes'
            body['class'] = ['admin-confirm-changes']
        if hint: node.append(wrap('hint', hint))
        if foot: foot.decompose()

    for node in list(soup.select('.btn, button.chip, button.icon-btn')):
        if 'chip' in classes(node) and node.has_attr('data-fill'):
            rename(node, 'tblr-suggestion', ['chip'])
            node['value'] = node['data-fill']
            icon = node.find('tblr-icon')
            if icon: icon['slot'] = 'icon'
            continue
        cls = list(classes(node))
        rename(node, 'tblr-button', ['btn', 'btn-primary', 'btn-danger', 'btn-ghost', 'btn-sm', 'icon-btn', 'chip'])
        node['variant'] = 'danger' if 'btn-danger' in cls else 'primary' if 'btn-primary' in cls or 'btn-ghost' in cls else 'secondary'
        if 'btn-sm' in cls: node['size'] = 'sm'
        if 'btn-ghost' in cls: node['appearance'] = 'ghost'
        if 'icon-btn' in cls or (not text(node) and node.find('tblr-icon')):
            node['icon-only'] = ''
            node['label'] = node.get('aria-label') or node.get('title') or 'Action'
        if 'chip' in cls: node['class'] = classes(node) + ['admin-filter']

    for node in list(soup.select('.figure')):
        value, label, description = node.select_one('.v'), node.select_one('.l'), node.select_one('.d')
        trend = 'up' if description and 'up' in classes(description) else 'down' if description and 'down' in classes(description) else 'neutral'
        rename(node, 'tblr-stat', ['figure'])
        node['value'], node['label'], node['description'], node['trend'] = text(value), text(label), text(description), trend
        node.clear()

    for node in list(soup.select('.sources')):
        codes = node.select('code')
        sources = [{'label': text(code)} for code in codes]
        for code in codes: code.extract()
        for icon in node.select('tblr-icon'): icon.extract()
        narrative = text(node)
        rename(node, 'tblr-source-list', ['sources'])
        node['label'] = narrative or 'Sources'
        node['sources'] = json.dumps(sources or [{'label': narrative or 'Lecture seule'}], ensure_ascii=False)
        node.clear()

    # Convert nested cards from inside out and retain the reference header/footer order.
    for node in reversed(list(soup.select('.card, section.panel'))):
        old = list(classes(node))
        panel = 'panel' in old
        heading = direct(node, '.card-head, .panel-head, .stage-head')
        body = direct(node, '.card-body, .panel-body')
        foot = direct(node, '.card-foot')
        rename(node, 'tblr-card', ['card', 'panel', 'risk', 'danger', 'good'])
        node['class'] = classes(node) + ['admin-panel' if panel else 'admin-card']
        if 'risk' in old: node['data-risk'] = 'danger' if 'danger' in old else 'warning'
        if 'good' in old: node['data-risk'] = 'success'
        if heading:
            heading['slot'] = 'header'
            heading['class'] = ['admin-card-heading'] + (['stage-head'] if 'stage-head' in classes(heading) else [])
        if body: body['class'] = ['admin-card-content'] + (['flush'] if 'flush' in classes(body) else [])
        if foot:
            foot['slot'] = 'footer'
            foot['class'] = ['admin-card-actions']
        for child in list(node.children):
            if isinstance(child, Tag) and (child.name == 'tblr-action-preview' or 'done' in classes(child)):
                child['slot'] = 'after-footer'

    for node in list(soup.select('.msg')):
        user = 'user' in classes(node)
        meta = node.select_one('.msg-meta')
        body = node.select_one('.msg-body') if not user else node.select_one('.bubble')
        avatar = direct(node, 'tblr-avatar')
        author = text(meta.find('b')) if meta and meta.find('b') else 'Vous' if user else 'Fil'
        rename(node, 'tblr-message', ['msg', 'user', 'agent'])
        node['class'] = classes(node) + ['admin-message']
        node['message-role'], node['author'] = 'user' if user else 'agent', author
        if avatar: avatar['slot'] = 'avatar'
        if meta:
            if meta.find('b'): meta.find('b').decompose()
            meta['slot'], meta['class'] = 'metadata', ['admin-message-meta']
        if body:
            body['class'] = ['admin-message-body']
            sources = direct(body, 'tblr-source-list')
            if sources:
                sources['slot'] = 'sources'
                node.append(sources.extract())

    # Preserve the exact rich authored cells and accessibility of native tables.
    for table in list(soup.select('table')):
        wrapper = element('tblr-data-table', authored='', **{'class': 'admin-table', 'aria-label': table.get('aria-label') or table.get('id') or 'Tableau de démonstration'})
        if table.has_attr('hidden'): wrapper['hidden'] = ''
        table.wrap(wrapper)

    for node in list(soup.select('input[type="checkbox"]')):
        checked = node.has_attr('checked')
        rename(node, 'tblr-checkbox')
        node.attrs.pop('type', None)
        if checked: node['checked'] = ''
        node['label'] = node.get('aria-label') or 'Sélectionner'
        # Accessible name without adding visible text to dense table cells.
        node['class'] = classes(node) + ['admin-check']
    for node in list(soup.select('select')):
        selected = node.select_one('option[selected]') or node.find('option')
        rename(node, 'tblr-select')
        if selected: node['value'] = selected.get('value', text(selected))
        node['aria-label'] = node.get('aria-label') or 'Réglage de notification'

    for node in list(soup.select('.composer')):
        field = node.find('input')
        hint = node.select_one('.foot')
        mark = node.find('tblr-avatar')
        new = element('tblr-composer', **{'class': 'admin-composer', 'rows': '1', 'label': field.get('aria-label', 'Votre demande') if field else 'Votre demande', 'placeholder': field.get('placeholder', '') if field else '', 'send-label': 'Envoyer'})
        if hint:
            hint['slot'], hint['class'] = 'hint', ['admin-composer-hint']
            new.append(hint.extract())
        if mark:
            mark['slot'] = 'mark'
            new.append(mark.extract())
        microphone = node.select_one('tblr-button.mic')
        if microphone:
            microphone['slot'] = 'controls'
            new.append(microphone.extract())
        icon = element('tblr-icon', name='arrow-up', **{'base-url': './icons', 'slot': 'submit-icon', 'aria-hidden': 'true'})
        new.append(icon)
        node.replace_with(new)

    for node in list(soup.select('form.cmd')):
        field = node.find('input')
        new = element('tblr-command-bar', **{'class': 'admin-command', 'label': field.get('aria-label', 'Demander à Fil'), 'placeholder': field.get('placeholder', ''), 'value': field.get('value', ''), 'shortcut-label': 'Ctrl K'})
        mark = node.find('tblr-avatar')
        if mark:
            mark['slot'] = 'mark'
            new.append(mark.extract())
        new.append(element('tblr-icon', name='microphone', **{'base-url': './icons', 'slot': 'submit-icon', 'aria-hidden': 'true'}))
        node.replace_with(new)

    # Navigation is still authored with groups and details, but links are nav items.
    rail = soup.select_one('aside.rail')
    if rail:
        for link in list(rail.select('a')):
            label_span = link.find('span')
            label = text(label_span) if label_span else text(link)
            count = link.select_one('.n')
            icon = link.find('tblr-icon')
            active = 'active' in classes(link)
            rename(link, 'tblr-nav-item', ['active'])
            link['label'] = label
            if active: link['active'] = ''
            if label_span: label_span.extract()
            if icon: icon['slot'] = 'icon'
            if count: count['slot'] = 'suffix'

    for node in list(soup.select('.story-sec')):
        items = node.select('.story-item')
        if not items: continue
        story = element('tblr-notification-story', appearance='narrative', **{'class': 'story-sec'})
        header, lead, quiet = node.select_one('.story-head'), node.select_one('.story-lead'), node.select_one('.quiet')
        if header:
            header['slot'] = 'header'; story.append(header.extract())
        if lead:
            lead['slot'] = 'lead'; story.append(lead.extract())
        if quiet: story['quiet-summary'] = text(quiet)
        records = []
        for index, item in enumerate(items):
            title = item.select_one('.t b') or item.find('b')
            reason, time, actions = item.select_one('.why'), item.find('time'), item.select_one('.act')
            title_text, reason_text, time_text = text(title), text(reason), text(time)
            if title: title.extract()
            if reason: reason.extract()
            if time: time.extract()
            if actions:
                actions['slot'] = f'actions-{index}'; story.append(actions.extract())
            dot = item.select_one('.dot')
            color = 'success' if dot and 'paiement' in classes(dot) else 'danger' if dot and 'alerte' in classes(dot) else 'warning' if dot and 'stock' in classes(dot) else 'secondary'
            records.append({'id': index, 'title': title_text, 'detail': text(item).lstrip(' :'), 'explanation': reason_text, 'timeLabel': time_text, 'severity': color})
        story['items'] = json.dumps(records, ensure_ascii=False)
        node.replace_with(story)

    for node in list(soup.select('ul.journal')):
        entries = []
        for li in node.select('li'):
            meta = li.select_one('.m')
            entry_meta = text(meta)
            if meta: meta.extract()
            outcome = 'read' if li.select_one('.ro') else 'confirmed'
            entries.append({'action': text(li), 'outcome': outcome, 'timeLabel': entry_meta})
        rename(node, 'tblr-audit-log', ['journal'])
        node['appearance'] = 'compact'
        node['entries'] = json.dumps(entries, ensure_ascii=False)
        node.clear()

    header, main, aside = soup.select_one('header.top'), soup.select_one('main.work'), soup.select_one('aside.story')
    shell = element('tblr-app-shell', **{'class': 'reference-shell', 'label': 'Espace de travail'})
    if snapshot.stem != 'index': shell['aside-open'] = ''
    brand = header.select_one('.brand')
    command = header.select_one('tblr-command-bar')
    account = header.select_one('.who')
    if brand: brand['slot'] = 'brand'; shell.append(brand.extract())
    if command: command['slot'] = 'header'; command['shortcut'] = ''; shell.append(command.extract())
    if account: account['slot'] = 'account'; shell.append(account.extract())
    navicon = element('tblr-icon', name='layout-sidebar', **{'base-url': './icons', 'slot': 'navigation-icon'})
    bellicon = element('span', slot='aside-icon', **{'class': 'bell-icon'})
    bellicon.append(element('tblr-icon', name='bell', **{'base-url': './icons'}))
    count = header.select_one('.count')
    if count: bellicon.append(count.extract())
    shell.append(navicon); shell.append(bellicon)
    if rail:
        rail.name = 'div'; rail['slot'] = 'navigation'; shell.append(rail.extract())
    if main:
        main.name = 'div'; main['class'] = ['work-content']; shell.append(main.extract())
    if aside:
        aside.name = 'div'; aside['slot'] = 'aside'; shell.append(aside.extract())
    header.decompose()
    soup.body.clear(); soup.body.append(shell)
    soup.body.append(element('script', type='module', src='app.js'))
    soup.body.append(element('div', id='demo-status', role='status', **{'aria-live': 'polite', 'class': 'demo-status', 'hidden': ''}))
    # Renamed void inputs must have explicit closing tags in HTML.
    for node in soup.find_all(lambda tag: tag.name.startswith('tblr-')):
        node.can_be_empty_element = False
    return str(soup)


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--snapshots', type=Path, required=True)
    args = parser.parse_args()
    OUTPUT.mkdir(parents=True, exist_ok=True)
    for file in args.snapshots.glob('*.html'):
        (OUTPUT / file.name).write_text(convert(file), encoding='utf-8')
    shutil.copyfile(REFERENCE / 'styles.css', OUTPUT / 'reference-layout.css')
    shutil.copyfile(REFERENCE / 'tokens.css', OUTPUT / 'tokens.css')
    shutil.copyfile(REFERENCE / 'README.md', OUTPUT / 'REFERENCE.md')

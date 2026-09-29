/*
 * ScanMe web — trang hồ sơ mở ra khi quét QR tạo từ app ScanMe (Android).
 *
 * App mã hoá hồ sơ thành URL (xem GenerateQrContentUseCase bên app):
 *   ?name=...&bio=...&phone=...&avatar=https://...&link=...&link=...
 * Trường rỗng bị bỏ; mỗi link là một tham số "link" riêng.
 *
 * Danh sách nền tảng / host, cách chuẩn hoá link và màu + icon phải khớp với
 * SocialPlatform.kt, normalizeLink() và PlatformIcon.kt bên app.
 */
(function (root) {
    'use strict';

    // [key, tên hiển thị, host nhận diện, màu thương hiệu, slug Simple Icons]
    var PLATFORMS = [
        ['FACEBOOK', 'Facebook', ['facebook.com', 'fb.com', 'fb.me'], '#0866FF', 'facebook'],
        ['MESSENGER', 'Messenger', ['m.me', 'messenger.com'], '#0084FF', 'messenger'],
        ['INSTAGRAM', 'Instagram', ['instagram.com', 'instagr.am'], '#E1306C', 'instagram'],
        ['THREADS', 'Threads', ['threads.net', 'threads.com'], '#000000', 'threads'],
        ['TIKTOK', 'TikTok', ['tiktok.com'], '#000000', 'tiktok'],
        ['YOUTUBE', 'YouTube', ['youtube.com', 'youtu.be'], '#FF0000', 'youtube'],
        ['X', 'X', ['x.com', 'twitter.com'], '#000000', 'x'],
        // Simple Icons không còn logo LinkedIn → hiển thị chữ "in".
        ['LINKEDIN', 'LinkedIn', ['linkedin.com'], '#0A66C2', null],
        ['GITHUB', 'GitHub', ['github.com'], '#181717', 'github'],
        ['TELEGRAM', 'Telegram', ['t.me', 'telegram.me'], '#26A5E4', 'telegram'],
        ['ZALO', 'Zalo', ['zalo.me'], '#0068FF', 'zalo'],
        ['WHATSAPP', 'WhatsApp', ['wa.me', 'whatsapp.com'], '#25D366', 'whatsapp'],
        ['DISCORD', 'Discord', ['discord.gg', 'discord.com'], '#5865F2', 'discord'],
        ['SPOTIFY', 'Spotify', ['spotify.com'], '#1DB954', 'spotify'],
        ['EMAIL', 'Email', [], '#EA4335', null],
        ['WEBSITE', 'Website', [], '#4F46E5', null]
    ].map(function (p) {
        return { key: p[0], name: p[1], hosts: p[2], color: p[3], icon: p[4] };
    });

    var BY_KEY = {};
    PLATFORMS.forEach(function (p) { BY_KEY[p.key] = p; });

    var SCHEME_REGEX = /^(https?:\/\/|mailto:|tel:)/i;
    var EMAIL_REGEX = /^[^@\s/]+@[^@\s/]+\.[^@\s/]+$/;

    /** Giống normalizeLink() bên app: "fb.com/a" → "https://fb.com/a", "a@b.com" → "mailto:a@b.com". */
    function normalizeLink(raw) {
        var link = String(raw == null ? '' : raw).trim();
        if (!link) return link;
        if (SCHEME_REGEX.test(link)) return link;
        if (EMAIL_REGEX.test(link)) return 'mailto:' + link;
        return 'https://' + link;
    }

    function hostOf(link) {
        try {
            return new URL(link).hostname.toLowerCase() || null;
        } catch (e) {
            return null;
        }
    }

    /** Giống SocialPlatform.detect(): so theo đuôi tên miền, không khớp → WEBSITE. */
    function detectPlatform(rawLink) {
        var link = normalizeLink(rawLink);
        if (/^mailto:/i.test(link)) return BY_KEY.EMAIL;
        if (/^tel:/i.test(link)) return BY_KEY.WEBSITE;
        var host = hostOf(link);
        if (!host) return BY_KEY.WEBSITE;
        for (var i = 0; i < PLATFORMS.length; i++) {
            var hosts = PLATFORMS[i].hosts;
            for (var j = 0; j < hosts.length; j++) {
                if (host === hosts[j] || host.slice(-(hosts[j].length + 1)) === '.' + hosts[j]) {
                    return PLATFORMS[i];
                }
            }
        }
        return BY_KEY.WEBSITE;
    }

    /** Chữ hiển thị dưới tên nền tảng: bỏ scheme, "www." và dấu "/" cuối. */
    function displayLink(link) {
        var text = link.replace(/^(https?:\/\/|mailto:|tel:)/i, '').replace(/^www\./i, '').replace(/\/+$/, '');
        try {
            text = decodeURIComponent(text);
        } catch (e) { /* giữ nguyên nếu không decode được */ }
        return text;
    }

    function safeHttpsUrl(raw) {
        var value = String(raw == null ? '' : raw).trim();
        return /^https:\/\//i.test(value) && hostOf(value) ? value : null;
    }

    function firstNonBlank(params, keys) {
        for (var i = 0; i < keys.length; i++) {
            var v = (params.get(keys[i]) || '').trim();
            if (v) return v;
        }
        return '';
    }

    /**
     * Đọc hồ sơ từ query string. Vẫn đọc các tham số cũ (Galaxy QR: major, fb, ig,
     * twitter, github, website) để mã QR đã in trước đây không bị hỏng.
     */
    function parseProfile(search) {
        var params = new URLSearchParams(search || '');
        var links = params.getAll('link');
        ['fb', 'ig', 'twitter', 'github', 'website'].forEach(function (key) {
            params.getAll(key).forEach(function (v) { links.push(v); });
        });

        return {
            name: firstNonBlank(params, ['name']),
            bio: firstNonBlank(params, ['bio', 'major']),
            phone: firstNonBlank(params, ['phone']),
            avatar: safeHttpsUrl(params.get('avatar')),
            links: links
                .map(normalizeLink)
                .filter(function (l) { return l.length > 0; })
                .map(function (l) { return { url: l, platform: detectPlatform(l) }; })
        };
    }

    // ---------------------------------------------------------------- UI

    var STRINGS = {
        en: {
            empty: 'This profile has no information yet.',
            emptyHint: 'Create your own profile QR with the ScanMe app.',
            phone: 'Phone',
            call: 'Call',
            links: 'Links',
            saveContact: 'Save contact',
            madeWith: 'Made with ScanMe',
            unnamed: 'ScanMe'
        },
        vi: {
            empty: 'Hồ sơ này chưa có thông tin.',
            emptyHint: 'Tạo mã QR hồ sơ của riêng bạn bằng app ScanMe.',
            phone: 'Số điện thoại',
            call: 'Gọi',
            links: 'Liên kết',
            saveContact: 'Lưu danh bạ',
            madeWith: 'Tạo bằng ScanMe',
            unnamed: 'ScanMe'
        }
    };

    var SVG_NS = 'http://www.w3.org/2000/svg';
    var ICON_PATHS = {
        person: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm0 2c-3.3 0-8 1.7-8 5v1h16v-1c0-3.3-4.7-5-8-5z',
        phone: 'M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1A17 17 0 0 1 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1z',
        email: 'M20 4H4a2 2 0 0 0-2 2v12c0 1.1.9 2 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zm0 4-8 5-8-5V6l8 5 8-5z',
        website: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm6.9 6h-2.9a15.7 15.7 0 0 0-1.4-3.6A8 8 0 0 1 18.9 8zM12 4c.8 1.2 1.5 2.5 1.9 4h-3.8c.4-1.4 1.1-2.8 1.9-4zM4.3 14a8.2 8.2 0 0 1 0-4h3.4a16.5 16.5 0 0 0 0 4H4.3zm.8 2h2.9c.3 1.3.8 2.5 1.4 3.6A8 8 0 0 1 5.1 16zM8 8H5.1a8 8 0 0 1 4.3-3.6C8.8 5.5 8.4 6.7 8 8zm4 12c-.8-1.2-1.5-2.5-1.9-4h3.8c-.4 1.4-1.1 2.8-1.9 4zm2.3-6H9.7a14.7 14.7 0 0 1 0-4h4.6a14.7 14.7 0 0 1 0 4zm.3 5.6c.6-1.1 1.1-2.3 1.4-3.6h2.9a8 8 0 0 1-4.3 3.6zm1.7-5.6a16.5 16.5 0 0 0 0-4h3.4a8.2 8.2 0 0 1 0 4h-3.4z',
        open: 'M14 3v2h3.6l-9.8 9.8 1.4 1.4L19 6.4V10h2V3h-7zm5 16H5V5h7V3H5a2 2 0 0 0-2 2v14c0 1.1.9 2 2 2h14a2 2 0 0 0 2-2v-7h-2v7z',
        download: 'M5 20h14v-2H5v2zM19 9h-4V3H9v6H5l7 7 7-7z'
    };

    function el(tag, className, text) {
        var node = document.createElement(tag);
        if (className) node.className = className;
        if (text != null) node.textContent = text;
        return node;
    }

    function svgIcon(name, className) {
        var svg = document.createElementNS(SVG_NS, 'svg');
        svg.setAttribute('viewBox', '0 0 24 24');
        svg.setAttribute('aria-hidden', 'true');
        if (className) svg.setAttribute('class', className);
        var path = document.createElementNS(SVG_NS, 'path');
        path.setAttribute('d', ICON_PATHS[name]);
        path.setAttribute('fill', 'currentColor');
        svg.appendChild(path);
        return svg;
    }

    /** Giống PlatformIcon bên app: nền tròn màu thương hiệu + logo trắng, lỗi tải → chữ cái đầu. */
    function platformIcon(platform) {
        var badge = el('span', 'platform-icon');
        badge.style.background = platform.color;
        if (platform.key === 'EMAIL') {
            badge.appendChild(svgIcon('email'));
        } else if (platform.key === 'WEBSITE') {
            badge.appendChild(svgIcon('website'));
        } else {
            var letter = el('span', 'platform-letter', platform.key === 'LINKEDIN' ? 'in' : platform.name.charAt(0));
            badge.appendChild(letter);
            if (platform.icon) {
                var img = el('img');
                img.alt = '';
                img.loading = 'lazy';
                img.src = 'https://cdn.simpleicons.org/' + platform.icon + '/white';
                img.onload = function () { letter.remove(); };
                img.onerror = function () { img.remove(); };
                badge.appendChild(img);
            }
        }
        return badge;
    }

    function linkRow(href, iconNode, title, subtitle, trailing) {
        var a = el('a', 'row');
        a.href = href;
        if (/^https?:/i.test(href)) {
            a.target = '_blank';
            a.rel = 'noopener noreferrer';
        }
        a.appendChild(iconNode);
        var texts = el('span', 'row-text');
        texts.appendChild(el('span', 'row-title', title));
        texts.appendChild(el('span', 'row-subtitle', subtitle));
        a.appendChild(texts);
        a.appendChild(trailing);
        return a;
    }

    function vcardEscape(value) {
        return value.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/([,;])/g, '\\$1');
    }

    function buildVCard(profile) {
        var lines = ['BEGIN:VCARD', 'VERSION:3.0'];
        var name = profile.name || 'ScanMe';
        lines.push('FN:' + vcardEscape(name));
        lines.push('N:;' + vcardEscape(name) + ';;;');
        if (profile.bio) lines.push('NOTE:' + vcardEscape(profile.bio));
        if (profile.phone) lines.push('TEL;TYPE=CELL:' + vcardEscape(profile.phone));
        profile.links.forEach(function (l) {
            if (l.platform.key === 'EMAIL') {
                lines.push('EMAIL:' + vcardEscape(l.url.replace(/^mailto:/i, '')));
            } else if (/^https?:/i.test(l.url)) {
                lines.push('URL:' + vcardEscape(l.url));
            }
        });
        lines.push('END:VCARD');
        return lines.join('\r\n');
    }

    function render(profile, t) {
        var hasContent = profile.name || profile.bio || profile.phone || profile.avatar || profile.links.length;
        document.title = (profile.name ? profile.name + ' · ' : '') + 'ScanMe';

        // Ảnh đại diện: ảnh từ app (catbox) → lỗi thì quay về icon người trên nền gradient.
        var avatar = document.getElementById('avatar');
        if (profile.avatar) {
            var img = el('img');
            img.alt = profile.name;
            img.src = profile.avatar;
            img.onerror = function () { img.remove(); avatar.appendChild(svgIcon('person')); };
            avatar.appendChild(img);
        } else {
            avatar.appendChild(svgIcon('person'));
        }

        document.getElementById('name').textContent = profile.name || t.unnamed;
        var bio = document.getElementById('bio');
        if (profile.bio) {
            bio.textContent = profile.bio;
        } else {
            bio.remove();
        }

        var body = document.getElementById('content');
        if (!hasContent) {
            var empty = el('div', 'empty');
            empty.appendChild(el('p', 'empty-title', t.empty));
            empty.appendChild(el('p', 'empty-hint', t.emptyHint));
            body.appendChild(empty);
            return;
        }

        if (profile.phone) {
            var phoneIcon = el('span', 'platform-icon phone-icon');
            phoneIcon.appendChild(svgIcon('phone'));
            var call = el('span', 'row-action', t.call);
            body.appendChild(linkRow('tel:' + profile.phone.replace(/[^\d+]/g, ''), phoneIcon, t.phone, profile.phone, call));
        }

        if (profile.links.length) {
            if (profile.phone) body.appendChild(el('h2', 'section-title', t.links));
            profile.links.forEach(function (l) {
                body.appendChild(linkRow(l.url, platformIcon(l.platform), l.platform.name, displayLink(l.url), svgIcon('open', 'row-open')));
            });
        }

        var save = el('button', 'save-contact');
        save.type = 'button';
        save.appendChild(svgIcon('download'));
        save.appendChild(document.createTextNode(t.saveContact));
        save.addEventListener('click', function () {
            var blob = new Blob([buildVCard(profile)], { type: 'text/vcard;charset=utf-8' });
            var a = el('a');
            a.href = URL.createObjectURL(blob);
            a.download = (profile.name || 'contact').replace(/[\\/:*?"<>|]+/g, '_') + '.vcf';
            document.body.appendChild(a);
            a.click();
            a.remove();
            setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
        });
        document.getElementById('actions').appendChild(save);
    }

    var api = {
        PLATFORMS: PLATFORMS,
        normalizeLink: normalizeLink,
        detectPlatform: detectPlatform,
        displayLink: displayLink,
        parseProfile: parseProfile,
        buildVCard: buildVCard
    };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = api;
    }

    if (typeof document !== 'undefined') {
        var lang = (navigator.language || 'en').toLowerCase().indexOf('vi') === 0 ? 'vi' : 'en';
        document.documentElement.lang = lang;
        var start = function () {
            var t = STRINGS[lang];
            document.getElementById('made-with').textContent = t.madeWith;
            render(parseProfile(root.location.search), t);
        };
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', start);
        } else {
            start();
        }
    }
})(typeof window !== 'undefined' ? window : this);

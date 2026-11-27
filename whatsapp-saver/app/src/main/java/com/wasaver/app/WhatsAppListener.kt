package com.wasaver.app

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat

/**
 * מאזין להתראות של ווטסאפ (רגיל ועסקי), שומר כל הודעה,
 * וכשהטקסט מתחלף ל"ההודעה הזו נמחקה" - מוצא את המקור ומקפיץ אותו.
 */
class WhatsAppListener : NotificationListenerService() {

    private data class Msg(val sender: String, val text: String, val time: Long)

    override fun onNotificationPosted(sbn: StatusBarNotification) {
        if (sbn.packageName !in WA_PACKAGES) return
        val n = sbn.notification ?: return
        if (n.flags and Notification.FLAG_GROUP_SUMMARY != 0) return
        if (n.category == Notification.CATEGORY_CALL) return

        try {
            handle(sbn.packageName, n, sbn.postTime)
        } catch (_: Throwable) {
            // לעולם לא מפילים את השירות בגלל התראה מוזרה
        }
    }

    private fun handle(pkg: String, n: Notification, postTime: Long) {
        val extras = n.extras
        val title = extras.getCharSequence(Notification.EXTRA_TITLE)?.toString()
        val style = NotificationCompat.MessagingStyle.extractMessagingStyleFromNotification(n)

        val chat: String
        val msgs: List<Msg>
        if (style != null && style.messages.isNotEmpty()) {
            chat = cleanChat(style.conversationTitle?.toString() ?: title) ?: return
            val me = style.user.name?.toString()
            msgs = style.messages.mapNotNull { m ->
                val text = m.text?.toString()?.trim().orEmpty()
                val sender = m.person?.name?.toString() ?: chat
                if (text.isEmpty() || (me != null && m.person != null && sender == me)) null
                else Msg(sender, text, m.timestamp)
            }
        } else {
            chat = cleanChat(title) ?: return
            val text = extras.getCharSequence(Notification.EXTRA_TEXT)?.toString()?.trim().orEmpty()
            if (text.isEmpty()) return
            msgs = listOf(Msg(chat, text, postTime))
        }

        val db = MessageDb.get(this)
        var changed = false
        val visibleTexts = msgs.map { it.text }.toSet()

        for (m in msgs) {
            when {
                isDeletedMarker(m.text) -> if (onDeleted(db, pkg, chat, m, visibleTexts)) changed = true
                isNoise(m.text) -> Unit
                else -> if (db.insertIfNew(pkg, chat, m.sender, m.text, m.time)) changed = true
            }
        }
        if (changed) sendBroadcast(Intent(ACTION_UPDATED).setPackage(packageName))
    }

    private fun onDeleted(db: MessageDb, pkg: String, chat: String, m: Msg, visible: Set<String>): Boolean {
        if (!db.claimMarker(pkg, chat, m.sender, m.time)) return false

        val candidates = db.candidates(pkg, chat, m.sender)
        // 1. התאמה מדויקת לפי זמן ההודעה (ווטסאפ שומר על אותו זמן כשהוא מחליף את הטקסט)
        // 2. אחרת - ההודעה האחרונה מאותו שולח שכבר לא מופיעה בהתראה
        val original = candidates.firstOrNull { it.msgTime == m.time }
            ?: candidates.firstOrNull { kotlin.math.abs(it.msgTime - m.time) < 3000 }
            ?: candidates.firstOrNull { it.text !in visible }
            ?: return false

        db.markDeleted(original.id)
        notifyDeleted(original)
        return true
    }

    private fun notifyDeleted(msg: SavedMessage) {
        val nm = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        if (Build.VERSION.SDK_INT >= 26) {
            nm.createNotificationChannel(
                NotificationChannel(CHANNEL_ID, getString(R.string.channel_name), NotificationManager.IMPORTANCE_HIGH)
            )
        }
        val open = PendingIntent.getActivity(
            this, 0,
            Intent(this, MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        val titleText = if (msg.sender == msg.chat) "🗑️ ${msg.sender} מחק/ה הודעה"
        else "🗑️ ${msg.sender} מחק/ה הודעה ב־${msg.chat}"

        val notification = NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_notify)
            .setContentTitle(titleText)
            .setContentText(msg.text)
            .setStyle(NotificationCompat.BigTextStyle().bigText(msg.text))
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true)
            .setContentIntent(open)
            .build()
        try {
            NotificationManagerCompat.from(this).notify(msg.id.toInt(), notification)
        } catch (_: SecurityException) {
            // אין הרשאת התראות - ההודעה עדיין שמורה ומופיעה באפליקציה
        }
    }

    companion object {
        const val ACTION_UPDATED = "com.wasaver.app.UPDATED"
        private const val CHANNEL_ID = "deleted_messages"
        val WA_PACKAGES = setOf("com.whatsapp", "com.whatsapp.w4b")

        private val DELETED_MARKERS = listOf(
            "this message was deleted",
            "ההודעה הזו נמחקה",
            "הודעה זו נמחקה",
            "ההודעה נמחקה",
            "este mensaje fue eliminado",
            "это сообщение удалено",
            "تم حذف هذه الرسالة",
        )

        private val NOISE = listOf(
            Regex("""^\d+\s+new messages?""", RegexOption.IGNORE_CASE),
            Regex("""^\d+\s+הודעות חדשות"""),
            Regex("""^\d+ messages from \d+ chats""", RegexOption.IGNORE_CASE),
            Regex("""^\d+ הודעות מ־?-?\d+ צ'אטים"""),
            Regex("""checking for new messages""", RegexOption.IGNORE_CASE),
            Regex("""בודק(ת)? אם יש הודעות חדשות"""),
            Regex("""whatsapp web is currently active""", RegexOption.IGNORE_CASE),
        )

        fun isDeletedMarker(text: String): Boolean {
            val t = text.lowercase().replace("🚫", "").trim()
            return DELETED_MARKERS.any { t.contains(it) }
        }

        fun isNoise(text: String) = NOISE.any { it.containsMatchIn(text) }

        /** "שם קבוצה (5 הודעות)" -> "שם קבוצה" */
        fun cleanChat(raw: String?): String? {
            val s = raw?.trim()?.replace(Regex("""\s*\(\d+[^)]*\)$"""), "")?.trim()
            return if (s.isNullOrEmpty() || s.equals("WhatsApp", ignoreCase = true)) null else s
        }
    }
}

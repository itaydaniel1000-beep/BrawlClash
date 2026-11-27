package com.wasaver.app

import android.content.ContentValues
import android.content.Context
import android.database.sqlite.SQLiteDatabase
import android.database.sqlite.SQLiteOpenHelper

data class SavedMessage(
    val id: Long,
    val pkg: String,
    val chat: String,
    val sender: String,
    val text: String,
    val msgTime: Long,
    val deleted: Boolean,
    val deletedAt: Long,
)

/** מסד נתונים מקומי בטלפון. שום דבר לא יוצא מהמכשיר. */
class MessageDb private constructor(context: Context) :
    SQLiteOpenHelper(context, "messages.db", null, 1) {

    override fun onCreate(db: SQLiteDatabase) {
        db.execSQL(
            """
            CREATE TABLE messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                pkg TEXT NOT NULL,
                chat TEXT NOT NULL,
                sender TEXT NOT NULL,
                text TEXT NOT NULL,
                msg_time INTEGER NOT NULL,
                received_at INTEGER NOT NULL,
                deleted INTEGER NOT NULL DEFAULT 0,
                deleted_at INTEGER NOT NULL DEFAULT 0
            )
            """.trimIndent()
        )
        db.execSQL("CREATE UNIQUE INDEX idx_msg_unique ON messages(pkg, chat, sender, msg_time, text)")
        db.execSQL("CREATE INDEX idx_msg_chat ON messages(pkg, chat, sender, msg_time)")
        // סימוני "ההודעה נמחקה" שכבר טיפלנו בהם, כדי לא להתריע פעמיים
        db.execSQL(
            "CREATE TABLE markers (pkg TEXT, chat TEXT, sender TEXT, msg_time INTEGER, " +
                "PRIMARY KEY(pkg, chat, sender, msg_time))"
        )
    }

    override fun onUpgrade(db: SQLiteDatabase, oldVersion: Int, newVersion: Int) {}

    fun insertIfNew(pkg: String, chat: String, sender: String, text: String, msgTime: Long): Boolean {
        val v = ContentValues().apply {
            put("pkg", pkg); put("chat", chat); put("sender", sender)
            put("text", text); put("msg_time", msgTime)
            put("received_at", System.currentTimeMillis())
        }
        return writableDatabase.insertWithOnConflict("messages", null, v, SQLiteDatabase.CONFLICT_IGNORE) != -1L
    }

    /** מחזיר true אם הסימון חדש (כלומר עוד לא טיפלנו בו). */
    fun claimMarker(pkg: String, chat: String, sender: String, msgTime: Long): Boolean {
        val v = ContentValues().apply {
            put("pkg", pkg); put("chat", chat); put("sender", sender); put("msg_time", msgTime)
        }
        return writableDatabase.insertWithOnConflict("markers", null, v, SQLiteDatabase.CONFLICT_IGNORE) != -1L
    }

    /** הודעות שעוד לא סומנו כמחוקות מאותו שולח באותו צ'אט, מהחדשה לישנה. */
    fun candidates(pkg: String, chat: String, sender: String, limit: Int = 30): List<SavedMessage> =
        query(
            "pkg=? AND chat=? AND sender=? AND deleted=0",
            arrayOf(pkg, chat, sender),
            "msg_time DESC, id DESC",
            limit
        )

    fun markDeleted(id: Long) {
        val v = ContentValues().apply {
            put("deleted", 1); put("deleted_at", System.currentTimeMillis())
        }
        writableDatabase.update("messages", v, "id=?", arrayOf(id.toString()))
    }

    fun list(onlyDeleted: Boolean, limit: Int = 500): List<SavedMessage> =
        if (onlyDeleted) query("deleted=1", null, "deleted_at DESC", limit)
        else query(null, null, "received_at DESC, id DESC", limit)

    fun clearAll() {
        writableDatabase.delete("messages", null, null)
        writableDatabase.delete("markers", null, null)
    }

    private fun query(where: String?, args: Array<String>?, order: String, limit: Int): List<SavedMessage> {
        val out = ArrayList<SavedMessage>()
        readableDatabase.query(
            "messages",
            arrayOf("id", "pkg", "chat", "sender", "text", "msg_time", "deleted", "deleted_at"),
            where, args, null, null, order, limit.toString()
        ).use { c ->
            while (c.moveToNext()) {
                out += SavedMessage(
                    id = c.getLong(0), pkg = c.getString(1), chat = c.getString(2),
                    sender = c.getString(3), text = c.getString(4), msgTime = c.getLong(5),
                    deleted = c.getInt(6) == 1, deletedAt = c.getLong(7),
                )
            }
        }
        return out
    }

    companion object {
        @Volatile private var instance: MessageDb? = null
        fun get(context: Context): MessageDb =
            instance ?: synchronized(this) {
                instance ?: MessageDb(context.applicationContext).also { instance = it }
            }
    }
}

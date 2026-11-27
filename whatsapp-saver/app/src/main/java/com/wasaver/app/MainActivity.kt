package com.wasaver.app

import android.Manifest
import android.app.Activity
import android.app.AlertDialog
import android.content.BroadcastReceiver
import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.provider.Settings
import android.view.View
import android.view.ViewGroup
import android.widget.BaseAdapter
import android.widget.Button
import android.widget.ListView
import android.widget.TextView
import android.widget.Toast
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

class MainActivity : Activity() {

    private lateinit var permissionCard: View
    private lateinit var tabDeleted: Button
    private lateinit var tabAll: Button
    private lateinit var list: ListView
    private lateinit var empty: TextView
    private val adapter = MessagesAdapter()
    private var showDeleted = true

    private val receiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context, intent: Intent) = refresh()
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        permissionCard = findViewById(R.id.permission_card)
        tabDeleted = findViewById(R.id.tab_deleted)
        tabAll = findViewById(R.id.tab_all)
        list = findViewById(R.id.list)
        empty = findViewById(R.id.empty)
        list.adapter = adapter
        list.emptyView = empty

        findViewById<Button>(R.id.grant_button).setOnClickListener {
            startActivity(Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS))
        }
        tabDeleted.setOnClickListener { showDeleted = true; refresh() }
        tabAll.setOnClickListener { showDeleted = false; refresh() }
        findViewById<Button>(R.id.clear_button).setOnClickListener {
            AlertDialog.Builder(this)
                .setMessage(R.string.clear_confirm)
                .setPositiveButton(R.string.clear) { _, _ -> MessageDb.get(this).clearAll(); refresh() }
                .setNegativeButton(R.string.cancel, null)
                .show()
        }
        list.setOnItemClickListener { _, _, pos, _ ->
            val m = adapter.getItem(pos)
            val cm = getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
            cm.setPrimaryClip(ClipData.newPlainText("message", m.text))
            Toast.makeText(this, R.string.copied, Toast.LENGTH_SHORT).show()
        }

        if (Build.VERSION.SDK_INT >= 33 &&
            checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED
        ) {
            requestPermissions(arrayOf(Manifest.permission.POST_NOTIFICATIONS), 1)
        }
    }

    override fun onResume() {
        super.onResume()
        ContextCompat.registerReceiver(
            this, receiver, IntentFilter(WhatsAppListener.ACTION_UPDATED), ContextCompat.RECEIVER_NOT_EXPORTED
        )
        val enabled = NotificationManagerCompat.getEnabledListenerPackages(this).contains(packageName)
        permissionCard.visibility = if (enabled) View.GONE else View.VISIBLE
        refresh()
    }

    override fun onPause() {
        super.onPause()
        unregisterReceiver(receiver)
    }

    private fun refresh() {
        tabDeleted.isEnabled = !showDeleted
        tabAll.isEnabled = showDeleted
        empty.setText(if (showDeleted) R.string.empty_deleted else R.string.empty_all)
        adapter.items = MessageDb.get(this).list(onlyDeleted = showDeleted)
        adapter.notifyDataSetChanged()
    }

    private inner class MessagesAdapter : BaseAdapter() {
        var items: List<SavedMessage> = emptyList()
        private val fmt = SimpleDateFormat("dd/MM HH:mm", Locale.getDefault())

        override fun getCount() = items.size
        override fun getItem(position: Int) = items[position]
        override fun getItemId(position: Int) = items[position].id

        override fun getView(position: Int, convertView: View?, parent: ViewGroup): View {
            val v = convertView ?: layoutInflater.inflate(R.layout.item_message, parent, false)
            val m = items[position]
            val who = if (m.sender == m.chat) m.sender else "${m.sender} · ${m.chat}"
            v.findViewById<TextView>(R.id.sender).text = who
            v.findViewById<TextView>(R.id.time).text = fmt.format(Date(m.msgTime))
            v.findViewById<TextView>(R.id.text).text = m.text
            val badge = v.findViewById<TextView>(R.id.badge)
            if (m.deleted) {
                badge.visibility = View.VISIBLE
                badge.text = getString(R.string.deleted_at, fmt.format(Date(m.deletedAt)))
            } else {
                badge.visibility = View.GONE
            }
            return v
        }
    }
}
